package com.toeic.identity.entrypoints;
import com.toeic.identity.adapters.security.TokenService;
import com.toeic.identity.core.IdentityUser;
import com.toeic.identity.data.jdbc.RbacService;
import com.toeic.identity.data.persistence.IdentityUserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
@RestController @RequestMapping("/ms/v1/identity") class IdentityDirectoryController {
 private final IdentityUserRepository repo;private final TokenService tokens;private final RbacService rbac;private final BCryptPasswordEncoder bcrypt=new BCryptPasswordEncoder();
 IdentityDirectoryController(IdentityUserRepository repo,TokenService tokens,RbacService rbac){this.repo=repo;this.tokens=tokens;this.rbac=rbac;}
 record Register(@NotBlank @Email String email,@NotBlank @Size(min=2,max=120) String displayName,@NotBlank @Size(min=8,max=72) String password){}
 record Login(@NotBlank String email,@NotBlank String password){}
 record UserView(UUID userId,String email,String displayName,String role){}
 record Session(String accessToken,String tokenType,long expiresIn,UserView user){}
 Session session(IdentityUser u){var access=rbac.access(u.userId);return new Session(tokens.issue(u.userId,access.roles(),access.permissions()),"Bearer",1800,view(u));}
 UserView view(IdentityUser u){return new UserView(u.userId,u.email,u.displayName,u.role);}
 @PostMapping("/register") @Transactional
 Session register(@Valid @RequestBody Register r){String email=r.email().trim().toLowerCase(Locale.ROOT);if(repo.findByEmailIgnoreCase(email).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already registered");
  var u=repo.saveAndFlush(new IdentityUser(email,r.displayName().trim(),bcrypt.encode(r.password())));rbac.grant(u.userId,"LEARNER");return session(u);}
 @PostMapping("/login") @Transactional(readOnly=true)
 Session login(@Valid @RequestBody Login r){var u=repo.findByEmailIgnoreCase(r.email().trim()).orElse(null);
  if(u==null||!bcrypt.matches(r.password(),u.passwordHash))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid credentials");
  return session(u);}
 @GetMapping("/me") @Transactional(readOnly=true)
 UserView me(@RequestHeader(value="Authorization",required=false) String header){var user=tokens.require(header);return repo.findById(user.userId()).map(this::view).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));}
 @GetMapping("/rbac/me") @Transactional(readOnly=true)
 RbacService.Access myPermissions(@RequestHeader(value="Authorization",required=false) String token){return rbac.access(tokens.require(token).userId());}
 @GetMapping("/admin/users") @Transactional(readOnly=true)
 RbacService.UserDirectoryPage listUsers(
   @RequestHeader(value="Authorization",required=false) String header,
   @RequestParam(defaultValue="") String q,
   @RequestParam(defaultValue="ALL") String role,
   @RequestParam(defaultValue="0") int page) {
  if(!tokens.require(header).can("rbac:manage"))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  if(q.length()>120 || page<0 || page>100000 || !Set.of("ALL","LEARNER","TEACHER","ADMIN").contains(role.toUpperCase(Locale.ROOT)))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  return rbac.directory(q,role,page);
 }

 record ProfileUpdate(@NotBlank @Size(min=2,max=120) String displayName){}
 record PasswordChange(@NotBlank String currentPassword,@NotBlank @Size(min=8,max=72) String newPassword){}
 @PatchMapping("/me") @Transactional
 UserView updateProfile(@RequestHeader(value="Authorization",required=false) String header,
                        @Valid @RequestBody ProfileUpdate input){
  var actor=tokens.require(header);
  var user=repo.findById(actor.userId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  String name=input.displayName().trim();
  if(name.length()<2 || name.length()>120)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  user.displayName=name;
  return view(user);
 }
 @PostMapping("/me/password") @Transactional
 void changePassword(@RequestHeader(value="Authorization",required=false) String header,
                     @Valid @RequestBody PasswordChange input){
  var actor=tokens.require(header);
  var user=repo.findById(actor.userId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  if(!bcrypt.matches(input.currentPassword(),user.passwordHash))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Current password is incorrect");
  if(input.currentPassword().equals(input.newPassword()))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"New password must be different");
  user.passwordHash=bcrypt.encode(input.newPassword());
 }

 record RoleChange(@NotNull @Pattern(regexp="LEARNER|TEACHER|ADMIN") String role){}
 @PostMapping("/admin/users/{id}/roles") @Transactional
 RbacService.Access grantRole(@RequestHeader(value="Authorization",required=false) String header,@PathVariable UUID id,@Valid @RequestBody RoleChange change){
  if(!tokens.require(header).can("rbac:manage"))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  if(!repo.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  rbac.grant(id,change.role());return rbac.access(id);
 }

}

package com.toeic.identity.data.jdbc;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
@Service public class RbacService {
 private final JdbcTemplate jdbc;
 RbacService(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public record Access(Set<String> roles,Set<String> permissions){}
 public record DirectoryUser(UUID userId,String email,String displayName,List<String> roles) {}
 public record UserDirectoryPage(List<DirectoryUser> users,long total,int page,int size) {}
 @Transactional(readOnly=true)
 public UserDirectoryPage directory(String query,String role,int page) {
  final int size=20;
  String term="%"+query.trim().toLowerCase(Locale.ROOT)+"%";
  String filter=role.trim().toUpperCase(Locale.ROOT);
  String where=" FROM identity_users u WHERE (LOWER(u.email) LIKE ? OR LOWER(u.display_name) LIKE ?) "
    +"AND (?='ALL' OR EXISTS (SELECT 1 FROM identity_user_roles f WHERE f.user_id=u.user_id AND f.role_code=?))";
  Long total=jdbc.queryForObject("SELECT COUNT(*)"+where,Long.class,term,term,filter,filter);
  List<DirectoryUser> rows=jdbc.query("SELECT u.user_id,u.email,u.display_name, "
    +"COALESCE(string_agg(r.role_code,',' ORDER BY r.role_code),'') AS roles "
    +"FROM identity_users u LEFT JOIN identity_user_roles r ON r.user_id=u.user_id "
    +"WHERE (LOWER(u.email) LIKE ? OR LOWER(u.display_name) LIKE ?) "
    +"AND (?='ALL' OR EXISTS (SELECT 1 FROM identity_user_roles f WHERE f.user_id=u.user_id AND f.role_code=?)) "
    +"GROUP BY u.user_id,u.email,u.display_name ORDER BY LOWER(u.display_name),u.user_id LIMIT ? OFFSET ?",
    (rs,i)->new DirectoryUser((UUID)rs.getObject("user_id"),rs.getString("email"),
      rs.getString("display_name"),rs.getString("roles").isEmpty() ? List.of() : List.of(rs.getString("roles").split(","))),
    term,term,filter,filter,size,page*size);
  return new UserDirectoryPage(rows,total==null?0:total,page,size);
 }

 @Transactional(readOnly=true)
 public Access access(UUID userId){
  var roles=new HashSet<>(jdbc.queryForList("SELECT role_code FROM identity_user_roles WHERE user_id=?",String.class,userId));
  var permissions=new HashSet<>(jdbc.queryForList("SELECT DISTINCT rp.permission_code FROM identity_user_roles ur JOIN identity_role_permissions rp ON rp.role_code=ur.role_code WHERE ur.user_id=?",String.class,userId));
  if(roles.isEmpty())throw new ResponseStatusException(HttpStatus.FORBIDDEN,"User has no roles");
  return new Access(Set.copyOf(roles),Set.copyOf(permissions));
 }
 @Transactional
 public void grant(UUID userId,String role){
  if(!Set.of("LEARNER","TEACHER","ADMIN").contains(role))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unknown role");
  jdbc.update("INSERT INTO identity_user_roles(user_id,role_code) VALUES (?,?) ON CONFLICT DO NOTHING",userId,role);
 }
}

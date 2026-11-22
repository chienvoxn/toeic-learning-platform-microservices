package com.toeic.interaction.entrypoints;
import com.toeic.interaction.adapters.security.IdentityClient;
import com.toeic.interaction.core.LearningActivity;
import com.toeic.interaction.data.persistence.ActivityRepo;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/interactions/activities") class ActivityController {
 private final ActivityRepo repo;private final IdentityClient identity;
 ActivityController(ActivityRepo repo,IdentityClient identity){this.repo=repo;this.identity=identity;}
 @GetMapping("/me") @Transactional(readOnly=true)
 List<LearningActivity> mine(@RequestHeader(value="Authorization",required=false) String bearer){return repo.findByUserIdOrderByRecordedAtDesc(identity.requireUser(bearer));}
}

package com.toeic.identity.data.persistence;
import com.toeic.identity.core.IdentityUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface IdentityUserRepository extends JpaRepository<IdentityUser,UUID>{Optional<IdentityUser> findByEmailIgnoreCase(String email);}

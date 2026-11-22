package com.toeic.membership.data.persistence;
import com.toeic.membership.core.Membership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface MembershipRepository extends JpaRepository<Membership,UUID>{Optional<Membership> findByUserId(UUID userId);}

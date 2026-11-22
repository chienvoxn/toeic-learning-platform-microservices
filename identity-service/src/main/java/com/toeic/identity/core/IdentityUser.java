package com.toeic.identity.core;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="identity_users") public class IdentityUser {
 @Id public UUID userId; @Column(nullable=false,unique=true) public String email; @Column(nullable=false) public String displayName;
 @Column(nullable=false) public String passwordHash;@Column(nullable=false) public String role;
 protected IdentityUser(){} public IdentityUser(String email,String name,String hash){userId=UUID.randomUUID();this.email=email;displayName=name;passwordHash=hash;role="LEARNER";}
}

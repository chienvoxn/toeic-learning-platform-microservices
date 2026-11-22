package com.toeic.interaction.adapters.messaging;
import com.toeic.interaction.core.LearningActivity;
import com.toeic.interaction.data.persistence.ActivityRepo;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Configuration class ActivityMessaging {
 @Bean TopicExchange toeicEvents(){return new TopicExchange("toeic.events",true,false);}
 @Bean org.springframework.amqp.core.Queue activityQueue(){return QueueBuilder.durable("interaction.attempt-graded").build();}
 @Bean Binding activityBinding(org.springframework.amqp.core.Queue activityQueue,TopicExchange toeicEvents){return BindingBuilder.bind(activityQueue).to(toeicEvents).with("attempt.graded");}
}
@Component class ActivityConsumer {
 private final ActivityRepo repo; private final ObjectMapper json;ActivityConsumer(ActivityRepo repo,ObjectMapper json){this.repo=repo;this.json=json;}
 @RabbitListener(queues="interaction.attempt-graded") @Transactional
 public void handle(String payload) throws Exception {var event=json.readTree(payload);UUID id=UUID.fromString(event.path("eventId").asText());
  if(!repo.existsById(id))repo.save(new LearningActivity(id,UUID.fromString(event.path("userId").asText()),UUID.fromString(event.path("attemptId").asText()),"ATTEMPT_GRADED"));}
}

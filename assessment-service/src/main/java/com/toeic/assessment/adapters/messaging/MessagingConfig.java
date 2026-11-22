package com.toeic.assessment.adapters.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.boot.amqp.autoconfigure.RabbitTemplateCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MessagingConfig {
    @Bean
    RabbitTemplateCustomizer useOutboxPublisherConnection() {
        return template -> template.setUsePublisherConnection(true);
    }

    @Bean
    TopicExchange toeicEvents() {
        return new TopicExchange("toeic.events", true, false);
    }

    @Bean
    Queue activityQueue() {
        return QueueBuilder.durable("interaction.attempt-graded").build();
    }

    @Bean
    Binding activityBinding(Queue activityQueue, TopicExchange toeicEvents) {
        return BindingBuilder.bind(activityQueue).to(toeicEvents).with("attempt.graded");
    }
}

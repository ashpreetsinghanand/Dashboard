package com.krsi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.krsi.model.Role;
import com.krsi.model.UserCategory;
import org.junit.jupiter.api.Test;

class UserCategoryTest {
    @Test void signupCardsMapToPersonas() {
        assertThat(UserCategory.fromId("farmer").role()).isEqualTo(Role.FARMER);
        assertThat(UserCategory.fromId("fpo").role()).isEqualTo(Role.FARMER);
        assertThat(UserCategory.fromId("trader").role()).isEqualTo(Role.MERCHANT);
        assertThat(UserCategory.fromId("FPU").role()).isEqualTo(Role.MERCHANT);
        assertThat(UserCategory.fromId("warehouse_owner").role()).isEqualTo(Role.WAREHOUSE_OWNER);
        assertThat(UserCategory.fromId("auditor").role()).isEqualTo(Role.AUDITOR);
        assertThatThrownBy(() -> UserCategory.fromId("banker")).isInstanceOf(IllegalArgumentException.class);
    }
}

package com.krsi;

import static org.assertj.core.api.Assertions.assertThat;

import com.krsi.repository.Rows;
import com.krsi.repository.SqlFilter;
import org.junit.jupiter.api.Test;

class RowsTest {
    @Test void likeEscapesWildcards() {
        assertThat(Rows.like(" 50%_off\\ ")).isEqualTo("%50\\%\\_off\\\\%");
    }

    @Test void filterSkipsBlankValuesAndKeepsArgOrder() {
        SqlFilter f = new SqlFilter().eq("a", " ").eq("b", 5L).search("x", "c", "d").ieq("e", null);
        assertThat(f.where()).isEqualTo(" WHERE 1=1 AND b = ? AND (c ILIKE ? ESCAPE '\\' OR d ILIKE ? ESCAPE '\\')");
        assertThat(f.args(20)).containsExactly(5L, "%x%", "%x%", 20);
    }
}

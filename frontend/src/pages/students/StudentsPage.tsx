import React, { useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableRow, TableHead, CircularProgress, Alert,
  TextField, MenuItem, Select, FormControl, Avatar
} from "@mui/material";
import {
  Search as SearchIcon,
  MailOutline as MailOutlineIcon
} from "@mui/icons-material";
import { useAuth, UserProfileDialog } from "../../App";
import { useData } from "../../contexts/DataContext";

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const { students, groups, updateStudentGroup, loading, error } = useData();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const groupNames = groups.map(g => g.name);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
                          student.email.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = groupFilter === "all" || student.group_name === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const handleGroupChange = async (studentId: string, newGroupName: string) => {
    if (newGroupName === "Без группы") {
      await updateStudentGroup(studentId, null, "Без группы");
    } else {
      const targetGroup = groups.find(g => g.name === newGroupName);
      await updateStudentGroup(studentId, targetGroup?.id || null, newGroupName);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={10}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
          {isTeacher ? "Студенты и успеваемость" : "Мои одногруппники"}
        </Typography>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, mb: 3.5, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          placeholder="Поиск по имени или email..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: "100%", sm: 300 } }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: "#94a3b8", mr: 1, fontSize: 20 }} />
          }}
        />

        {isTeacher && (
          <FormControl size="small" sx={{ width: 180 }}>
            <Select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">Все группы</MenuItem>
              {groupNames.map((g, idx) => (
                <MenuItem key={idx} value={g}>{g}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "12px", overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Студент</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Группа</TableCell>
              {isTeacher && (
                <>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", textAlign: "center" }}>Сдано тестов</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", textAlign: "right" }}>Средний балл</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const initials = student.name.split(" ").map(n => n[0]).join("").toUpperCase();
                return (
                  <TableRow key={student.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: "#eceff1", color: "#475569", fontSize: "0.85rem", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                          {initials}
                        </Avatar>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: "#0f172a",
                            cursor: "pointer",
                            "&:hover": { color: "#0040b0", textDecoration: "underline" }
                          }}
                          onClick={() => setSelectedUserId(student.id)}
                        >
                          {student.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "#64748b" }}>
                      <Box display="flex" alignItems="center" gap={0.8}>
                        <MailOutlineIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                        {student.email}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {isTeacher ? (
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select
                            value={student.group_name}
                            onChange={(e) => handleGroupChange(student.id, e.target.value)}
                            sx={{ fontSize: "0.875rem", fontWeight: 600 }}
                          >
                            <MenuItem value="Без группы">Без группы</MenuItem>
                            {groupNames.map((g, idx) => (
                              <MenuItem key={idx} value={g}>{g}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                          {student.group_name || "Без группы"}
                        </Typography>
                      )}
                    </TableCell>
                    {isTeacher && (
                      <>
                        <TableCell sx={{ textAlign: "center", color: "#475569", fontWeight: 600 }}>
                          {student.completed_exams}
                        </TableCell>
                        <TableCell sx={{ textAlign: "right", fontWeight: 800, color: "#0040b0" }}>
                          {student.average_score}%
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={isTeacher ? 5 : 3} align="center" sx={{ py: 6, color: "#64748b" }}>
                  Студенты не найдены.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <UserProfileDialog userId={selectedUserId} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </Box>
  );
};

export default StudentsPage;

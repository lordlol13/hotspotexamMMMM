import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableRow, TableHead, CircularProgress, Alert, Grid, Card, CardContent, Chip
} from "@mui/material";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import StarsIcon from "@mui/icons-material/Stars";
import TimelineIcon from "@mui/icons-material/Timeline";
import axios from "axios";
import { useAuth, UserProfileDialog } from "../../App";
import { useData } from "../../contexts/DataContext";

interface ExamAttemptHistory {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  started_at: string;
  submitted_at: string;
  score: number;
  max_score: number;
  score_pct: number;
  passing_score: number;
  passed: boolean;
  is_graded: boolean;
}

interface ScoreTrendItem {
  date: string;
  score_pct: number;
  exam_title: string;
}

interface StudentAnalytics {
  average_score: number;
  completion_rate: number;
  exam_history: ExamAttemptHistory[];
  score_trends: ScoreTrendItem[];
}

export const GradesPage: React.FC = () => {
  const { user } = useAuth();
  const { students, loading: dataLoading, error: dataError } = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [studentData, setStudentData] = useState<StudentAnalytics | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (user?.role === "student") {
        try {
          setLoading(true);
          const res = await axios.get("/api/v1/analytics/student");
          setStudentData(res.data);
        } catch {
          setError("Используются демонстрационные данные.");
          setStudentData({
            average_score: 83.5,
            completion_rate: 75.0,
            exam_history: [
              {
                attempt_id: "attempt1",
                exam_id: "exam1",
                exam_title: "Экзамен по цитологии и митозу",
                started_at: "2026-06-11T09:00:00Z",
                submitted_at: "2026-06-11T09:20:15Z",
                score: 8.5,
                max_score: 10.0,
                score_pct: 85.0,
                passing_score: 70.0,
                passed: true,
                is_graded: true
              },
              {
                attempt_id: "attempt2",
                exam_id: "exam2",
                exam_title: "Тест: Эпителиальные ткани",
                started_at: "2026-06-12T11:00:00Z",
                submitted_at: "2026-06-12T11:18:44Z",
                score: 8.2,
                max_score: 10.0,
                score_pct: 82.0,
                passing_score: 60.0,
                passed: true,
                is_graded: true
              }
            ],
            score_trends: [
              { date: "2026-06-11", score_pct: 85.0, exam_title: "Экзамен по цитологии и митозу" },
              { date: "2026-06-12", score_pct: 82.0, exam_title: "Тест: Эпителиальные ткани" }
            ]
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [user]);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const overallStats = isTeacher ? {
    average_score: students.length > 0
      ? Math.round((students.reduce((acc, s) => acc + s.average_score, 0) / students.length) * 10) / 10
      : 0,
    pass_rate: students.length > 0
      ? Math.round((students.filter(s => s.average_score >= 60).length / students.length) * 1000) / 10
      : 0,
    fail_rate: students.length > 0
      ? Math.round((students.filter(s => s.average_score < 60).length / students.length) * 1000) / 10
      : 0,
    total_attempts: students.reduce((acc, s) => acc + s.completed_exams, 0),
  } : null;

  const rankings = [...students].sort((a, b) => b.average_score - a.average_score);

  if (loading || dataLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={10}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 2 }}>
      {}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
          {isTeacher ? "Журнал оценок и успеваемость" : "Моя зачетная книжка"}
        </Typography>
      </Box>

      {(error || dataError) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error || dataError}
        </Alert>
      )}

      {isTeacher ? (
        <Box>
          {}
          <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>Средний балл потока</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0040b0", mt: 0.5 }}>
                    {overallStats?.average_score}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>Процент сдачи (Pass Rate)</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#10b981", mt: 0.5 }}>
                    {overallStats?.pass_rate}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>Не сдали (Fail Rate)</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#ef4444", mt: 0.5 }}>
                    {overallStats?.fail_rate}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>Всего попыток сдачи</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", mt: 0.5 }}>
                    {overallStats?.total_attempts}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Grid container spacing={4} sx={{ mb: 5 }}>
          {}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "12px" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <StarsIcon sx={{ color: "#0040b0" }} />
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                      Моя успеваемость
                    </Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: "#0040b0" }}>
                    {studentData?.average_score || 0}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", mt: 1, display: "block" }}>
                    Средневзвешенная оценка по всем попыткам
                  </Typography>
                </CardContent>
              </Card>

              {}
              {studentData?.score_trends && studentData.score_trends.length > 0 && (
                <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "12px" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                      <TimelineIcon sx={{ color: "#0040b0" }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                        Динамика успеваемости
                      </Typography>
                    </Box>
                    <Box sx={{ height: 160, width: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={studentData.score_trends}>
                          <defs>
                            <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0040b0" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#0040b0" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "0.75rem", fill: "#94a3b8" }} />
                          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: "0.75rem", fill: "#94a3b8" }} />
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <Box sx={{ bgcolor: "#0f172a", p: 1, px: 1.5, borderRadius: "6px", color: "#ffffff" }}>
                                  <Typography variant="caption" display="block">{payload[0].payload.exam_title}</Typography>
                                  <Typography variant="body2" fontWeight={800} color="#38bdf8">{payload[0].value}%</Typography>
                                </Box>
                              );
                            }}
                          />
                          <Area type="monotone" dataKey="score_pct" stroke="#0040b0" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>

          {}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>
              История прохождения тестов
            </Typography>
            <TableContainer component={Paper} sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "12px", overflow: "hidden" }}>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Экзамен / Дата</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", textAlign: "center" }}>Баллы</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", textAlign: "center" }}>Процент</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", textAlign: "right" }}>Результат</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentData?.exam_history && studentData.exam_history.length > 0 ? (
                    studentData.exam_history.map((attempt, idx) => (
                      <TableRow key={idx} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                            {attempt.exam_title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748b" }}>
                            {new Date(attempt.submitted_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", color: "#475569", fontWeight: 600 }}>
                          {attempt.score} / {attempt.max_score}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                          {attempt.score_pct}%
                        </TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          <Chip
                            icon={attempt.passed ? <CheckCircleOutlineIcon sx={{ fontSize: 16 }} /> : <ErrorOutlineIcon sx={{ fontSize: 16 }} />}
                            label={attempt.passed ? "Сдано" : "Не сдано"}
                            size="small"
                            sx={{
                              bgcolor: attempt.passed ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                              color: attempt.passed ? "#10b981" : "#ef4444",
                              fontWeight: 700,
                              "& .MuiChip-icon": { color: "inherit" }
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: "#64748b" }}>
                        Вы еще не сдали ни одного теста.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {}
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>
        Рейтинг успеваемости студентов
      </Typography>
      <TableContainer component={Paper} sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "12px", overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Место / Студент</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Группа</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", textAlign: "center" }}>Завершено экзаменов</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", textAlign: "right" }}>Средняя оценка</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rankings.map((student, idx) => (
              <TableRow key={student.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                <TableCell sx={{ fontWeight: 600, color: "#0f172a" }}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: idx < 3 ? "#0040b0" : "#64748b", width: 24 }}>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                    </Typography>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          cursor: "pointer",
                          "&:hover": { color: "#0040b0", textDecoration: "underline" }
                        }}
                        onClick={() => setSelectedUserId(student.id)}
                      >
                        {student.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>{student.email}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>{student.group_name}</TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                  {student.hide_grades && user?.role === "student" && student.id !== user?.id
                    ? "[Скрыто]"
                    : student.completed_exams}
                </TableCell>
                <TableCell sx={{ textAlign: "right", fontWeight: 800, color: "#0040b0" }}>
                  {student.hide_grades && user?.role === "student" && student.id !== user?.id
                    ? "[Скрыто]"
                    : `${student.average_score}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {}
      <UserProfileDialog userId={selectedUserId} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </Box>
  );
};

export default GradesPage;

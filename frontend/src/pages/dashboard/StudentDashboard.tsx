import React, { useEffect, useState } from "react";
import {
  Box, Typography, Grid, Paper, Table, TableBody, TableCell,
  TableContainer, TableRow, TableHead, CircularProgress, Alert, Card, CardContent,
  Divider, Stack, Chip
} from "@mui/material";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import axios from "axios";

import { useAuth } from "../../App";

interface ExamHistoryItem {
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
  exam_history: ExamHistoryItem[];
  score_trends: ScoreTrendItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        px: 2,
        py: 1.2,
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ color: "#38bdf8" }}>
        {payload[0].value}%
      </Typography>
      <Typography variant="caption" sx={{ color: "#cbd5e1" }}>
        {payload[0].payload.exam_title}
      </Typography>
    </Box>
  );
};

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const res = await axios.get("/api/v1/analytics/student");
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        if (!silent) {
          setError("Could not retrieve live analytics. Rendering sandbox demo mode.");

          setData({
            average_score: 84.5,
            completion_rate: 66.7,
            exam_history: [
              {
                attempt_id: "1",
                exam_id: "6e94e3a4-0bc5-4caf-b783-e256f3fda94b",
                exam_title: "Mitosis & Cytology Exam",
                started_at: "2026-06-12T10:00:00Z",
                submitted_at: "2026-06-12T10:14:23Z",
                score: 8.5,
                max_score: 10.0,
                score_pct: 85.0,
                passing_score: 75.0,
                passed: true,
                is_graded: true
              },
              {
                attempt_id: "2",
                exam_id: "55555555-5555-5555-5555-555555555555",
                exam_title: "Epithelium tissues Quiz",
                started_at: "2026-06-13T14:30:00Z",
                submitted_at: "2026-06-13T14:48:12Z",
                score: 8.4,
                max_score: 10.0,
                score_pct: 84.0,
                passing_score: 60.0,
                passed: true,
                is_graded: true
              }
            ],
            score_trends: [
              { date: "2026-06-08", score_pct: 78.0, exam_title: "Pre-Assessment" },
              { date: "2026-06-12", score_pct: 85.0, exam_title: "Mitosis & Cytology Exam" },
              { date: "2026-06-13", score_pct: 84.0, exam_title: "Epithelium tissues Quiz" }
            ]
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchAnalytics(false);
    const timer = setInterval(() => {
      fetchAnalytics(true);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={16} sx={{ minHeight: "60vh" }}>
        <CircularProgress size={44} />
      </Box>
    );
  }

  const averageScore = data?.average_score || 0;
  const completionRate = data?.completion_rate || 0;
  const history = data?.exam_history || [];
  const trends = data?.score_trends || [];

  const currentDate = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const kpiCards = [
    {
      label: "Средний балл",
      value: `${averageScore.toFixed(1)}%`,
      color: "#0040b0",
      bgColor: "rgba(0, 64, 176, 0.06)",
      icon: <SchoolIcon sx={{ fontSize: 26, color: "#0040b0" }} />,
    },
    {
      label: "Процент сдачи",
      value: `${completionRate.toFixed(1)}%`,
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.06)",
      icon: <AssignmentTurnedInIcon sx={{ fontSize: 26, color: "#10b981" }} />,
    },
    {
      label: "Всего попыток",
      value: `${history.length}`,
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.06)",
      icon: <TrendingUpIcon sx={{ fontSize: 26, color: "#f59e0b" }} />,
    },
  ];

  const infoPanelRows = [
    { label: "Курс", value: "Цифровая гистология (MED-204)", dotColor: "#0040b0" },
    { label: "Кафедра", value: "Микроскопическая анатомия", dotColor: "#6366f1" },
    { label: "Активные пересдачи", value: "Отсутствуют", dotColor: "#f59e0b" },
    { label: "Минимальный порог", value: "≥ 60.0%", dotColor: "#10b981" },
  ];

  return (
    <Box>
      {}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: "#0f172a" }}>
            Рады видеть вас, {user?.first_name} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Отслеживайте свой прогресс по микроскопическим экзаменам и просматривайте историю оценок.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, mt: 0.8 }}>
          {currentDate}
        </Typography>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((card) => (
          <Grid item xs={12} sm={4} key={card.label}>
            <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: card.bgColor,
                  }}
                >
                  {card.icon}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, display: "block", mb: 0.2 }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: card.color }}>
                    {card.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Динамика успеваемости
            </Typography>

            {trends.length > 0 ? (
              <Box sx={{ width: "100%", height: 250 }}>
                <ResponsiveContainer>
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0040b0" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0040b0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score_pct"
                      stroke="#0040b0"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#scoreFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={220}>
                <Typography variant="body2" color="text.secondary">
                  График успеваемости пуст.
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2.5, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Общая информация
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ознакомьтесь с актуальными требованиями курса и академическими параметрами вашей учебной группы.
            </Typography>

            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2} sx={{ flexGrow: 1 }}>
              {infoPanelRows.map((row) => (
                <Box key={row.label} display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: row.dotColor }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {row.label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                    {row.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          История экзаменов
        </Typography>

        <TableContainer component={Paper} sx={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Экзамен</TableCell>
                <TableCell>Дата сдачи</TableCell>
                <TableCell>Результат</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Проверка</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length > 0 ? (
                history.map((item) => (
                  <TableRow key={item.attempt_id}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {item.exam_title}
                    </TableCell>
                    <TableCell>
                      {new Date(item.submitted_at).toLocaleDateString("ru-RU", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {item.is_graded ? `${item.score_pct.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {!item.is_graded ? (
                        <Chip
                          label="На проверке"
                          size="small"
                          variant="outlined"
                          sx={{
                            color: "#f59e0b",
                            borderColor: "#fef3c7",
                            bgcolor: "#fffbeb",
                            fontWeight: 600,
                          }}
                        />
                      ) : item.passed ? (
                        <Chip
                          label="Сдано"
                          size="small"
                          sx={{
                            fontWeight: 600,
                            color: "#166534",
                            bgcolor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                          }}
                        />
                      ) : (
                        <Chip
                          label="Не сдано"
                          size="small"
                          sx={{
                            fontWeight: 600,
                            color: "#991b1b",
                            bgcolor: "#fef2f2",
                            border: "1px solid #fecaca",
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {item.is_graded ? "Автооценка" : "Проверяется преподавателем"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: "#64748b" }}>
                    У вас пока нет завершенных попыток сдачи экзаменов.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default StudentDashboard;

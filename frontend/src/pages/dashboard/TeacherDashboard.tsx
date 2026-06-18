import React, { useEffect, useState } from "react";
import {
  Box, Typography, Grid, Paper, Table, TableBody, TableCell,
  TableContainer, TableRow, TableHead, CircularProgress, Alert, Card, CardContent
} from "@mui/material";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import {
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  AssignmentLate as AssignmentLateIcon,
  Percent as PercentIcon
} from "@mui/icons-material";
import axios from "axios";

interface GroupStat {
  group_name: string;
  course_title: string;
  average_score: number;
  pass_rate: number;
  fail_rate: number;
  total_attempts: number;
}

interface StudentRanking {
  student_name: string;
  email: string;
  group_name: string;
  average_score: number;
  completed_exams: number;
}

interface QuestionDifficulty {
  exam_title: string;
  question_text: string;
  question_type: string;
  correct_percentage: number;
  total_responses: number;
}

interface TeacherAnalytics {
  group_statistics: GroupStat[];
  student_rankings: StudentRanking[];
  overall_stats: {
    pass_rate: number;
    fail_rate: number;
    total_attempts: number;
    average_score: number;
  };
  question_difficulty: QuestionDifficulty[];
}

const COLORS = ["#10b981", "#ef4444"];

const getDifficultyColor = (pct: number): string => {
  if (pct < 50) return "#ef4444";
  if (pct <= 75) return "#f59e0b";
  return "#10b981";
};

const getDifficultyLabel = (pct: number): string => {
  if (pct < 50) return "Сложный";
  if (pct <= 75) return "Средний";
  return "Простой";
};

const getMedalEmoji = (rank: number): string => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const GlassTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        backgroundColor: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        px: 2,
        py: 1.2,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, display: "block", mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map((entry: any, i: number) => (
        <Typography key={i} variant="body2" sx={{ color: entry.color === "#10b981" ? "#34d399" : entry.color === "#ef4444" ? "#f87171" : entry.color, fontWeight: 600 }}>
          {entry.name === "Pass Rate" ? "Успешно" : entry.name === "Fail Rate" ? "Не сдано" : entry.name}: {typeof entry.value === "number" ? `${entry.value}%` : entry.value}
        </Typography>
      ))}
    </Box>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  accent: string;
  bgColor: string;
  icon: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, accent, bgColor, icon }) => (
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
          bgcolor: bgColor,
          "& .MuiSvgIcon-root": { fontSize: 24, color: accent },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, display: "block", mb: 0.2 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
          {value}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

export const TeacherDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeacherAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacherAnalytics = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const res = await axios.get("/api/v1/analytics/teacher");
        setData(res.data);
      } catch (err: any) {
        if (!silent) {
          setError("Не удалось загрузить аналитику с сервера.");
          setData(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchTeacherAnalytics(false);
    const timer = setInterval(() => {
      fetchTeacherAnalytics(true);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={12} sx={{ minHeight: "60vh" }}>
        <CircularProgress size={44} />
      </Box>
    );
  }

  const overall = data?.overall_stats || { pass_rate: 0, fail_rate: 0, total_attempts: 0, average_score: 0 };
  const groups = data?.group_statistics || [];
  const rankings = data?.student_rankings || [];
  const questions = data?.question_difficulty || [];

  const pieData = [
    { name: "Pass Rate", value: overall.pass_rate },
    { name: "Fail Rate", value: overall.fail_rate }
  ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: "#0f172a" }}>
          Панель преподавателя
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Контролируйте результаты групп, отслеживайте рейтинги студентов и анализируйте сложность экзаменационных вопросов.
        </Typography>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Общий процент сдачи"
            value={`${overall.pass_rate.toFixed(1)}%`}
            accent="#10b981"
            bgColor="rgba(16, 185, 129, 0.06)"
            icon={<CheckCircleIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Средний балл потока"
            value={`${overall.average_score.toFixed(1)}%`}
            accent="#0040b0"
            bgColor="rgba(0, 64, 176, 0.06)"
            icon={<PercentIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Всего сдано экзаменов"
            value={`${overall.total_attempts}`}
            accent="#f59e0b"
            bgColor="rgba(245, 158, 11, 0.06)"
            icon={<GroupIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Неудовлетворительно"
            value={`${overall.fail_rate.toFixed(1)}%`}
            accent="#ef4444"
            bgColor="rgba(239, 68, 68, 0.06)"
            icon={<AssignmentLateIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Соотношение сдачи экзаменов
            </Typography>
            <Box sx={{ width: "100%", height: 250, display: "flex", justifyContent: "center", alignItems: "center", minWidth: 0 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltipContent />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (value === "Pass Rate" ? "Сдано" : "Не сдано")}
                  />
                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central">
                    <tspan style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 20, fill: "#0f172a" }}>
                      {overall.pass_rate.toFixed(1)}%
                    </tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Успеваемость по учебным группам
            </Typography>
            <Box sx={{ width: "100%", height: 250, minWidth: 0 }}>
              <ResponsiveContainer>
                <BarChart data={groups} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="group_name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<GlassTooltipContent />} />
                  <Bar dataKey="average_score" name="Средний балл" fill="#0040b0" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            Рейтинг студентов
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="60">Место</TableCell>
                  <TableCell>Студент</TableCell>
                  <TableCell>Группа</TableCell>
                  <TableCell align="right">Ср. балл</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankings.map((student, idx) => (
                  <TableRow key={student.email}>
                    <TableCell sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                      {getMedalEmoji(idx + 1)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{student.student_name}</TableCell>
                    <TableCell>{student.group_name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#0040b0" }}>
                      {student.average_score.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            Анализ сложности вопросов
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Вопрос</TableCell>
                  <TableCell>Экзамен</TableCell>
                  <TableCell>Сложность</TableCell>
                  <TableCell align="right">Верно</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questions.map((q, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {q.question_text}
                    </TableCell>
                    <TableCell sx={{ color: "#64748b", fontSize: "0.82rem" }}>{q.exam_title}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: getDifficultyColor(q.correct_percentage) }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem", color: getDifficultyColor(q.correct_percentage) }}>
                          {getDifficultyLabel(q.correct_percentage)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {q.correct_percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherDashboard;

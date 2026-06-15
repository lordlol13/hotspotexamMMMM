import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../App";
import {
  Box, Button, Card, CardContent, FormControlLabel, Radio,
  RadioGroup, Checkbox, TextField, Typography, Grid, Paper,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, FormLabel, FormControl, FormGroup,
  Divider, LinearProgress, IconButton, Stack, Chip, ToggleButtonGroup, ToggleButton,
  InputLabel, Select, MenuItem
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LaunchIcon from "@mui/icons-material/Launch";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import axios from "axios";

import ExamTimer from "../../components/exams/ExamTimer";
import SlideViewer from "../../components/slides/SlideViewer";

interface Option {
  id: string;
  option_text: string;
  order_index: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "true_false" | "short_answer" | "essay" | "point_on_image";
  points: number;
  order_index: number;
  slide_id?: string;
  region_of_interest?: any;
  options: Option[];
  is_flagged?: boolean;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  passing_score: number;
  questions: Question[];
}

interface Attempt {
  id: string;
  started_at: string;
  attempt_number: number;
}

interface AnswerState {
  question_id: string;
  selected_option_id?: string;
  selected_option_ids?: string[];
  text_answer?: string;
  annotation_data?: { x: number; y: number };
}

export const ExamTakePage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [leaderboardMode, setLeaderboardMode] = useState<"group" | "university">("group");
  const [filterGroup, setFilterGroup] = useState<string>("104-МФ");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterUniversity, setFilterUniversity] = useState<string>("all");

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewQuestion, setReviewQuestion] = useState<Question | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState<any | null>(null);

  const handleShowHotspotResult = (q: Question, ans: any) => {
    setReviewQuestion(q);
    setReviewAnswer(ans);
    setReviewDialogOpen(true);
  };

  const getElapsedTimeStr = () => {
    if (!result || !result.started_at) return "00:00";
    const startMs = new Date(result.started_at).getTime();
    const endMs = result.submitted_at ? new Date(result.submitted_at).getTime() : Date.now();
    const elapsedSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank.toString();
  };

  useEffect(() => {
    if (!examId) return;

    const loadExamAndAttempt = async () => {
      try {
        setLoading(true);
        setError(null);

        const examRes = await axios.get(`/api/v1/exams/${examId}`);
        const loadedExam = examRes.data;
        loadedExam.questions.sort((a: Question, b: Question) => a.order_index - b.order_index);
        setExam(loadedExam);

        const isTeacher = user?.role === "teacher" || user?.role === "admin";

        if (isTeacher) {
          setAttempt({
            id: "preview",
            started_at: new Date().toISOString(),
            attempt_number: 1
          });
        } else {
          const startRes = await axios.post(`/api/v1/exams/${examId}/start`);
          setAttempt(startRes.data);
        }

        const saved = localStorage.getItem(`exam_answers_${examId}`);
        if (saved && !isTeacher) {
          try {
            setAnswers(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse saved answers", e);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.detail || "Failed to load exam attempt.");
      } finally {
        setLoading(false);
      }
    };

    loadExamAndAttempt();
  }, [examId, user]);

  useEffect(() => {
    const isTeacher = user?.role === "teacher" || user?.role === "admin";
    if (examId && Object.keys(answers).length > 0 && !isTeacher) {
      localStorage.setItem(`exam_answers_${examId}`, JSON.stringify(answers));
    }
  }, [answers, examId, user]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" bgcolor="#f8fafc">
        <CircularProgress size={44} />
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          Инициализация экзаменационного окружения...
        </Typography>
      </Box>
    );
  }

  if (error || !exam || !attempt) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" p={3} bgcolor="#f8fafc">
        <Typography color="error" variant="h6" align="center" gutterBottom>
          {error || "Произошла ошибка при загрузке экзамена."}
        </Typography>
        <Button variant="contained" onClick={() => navigate("/exams")} sx={{ mt: 2, bgcolor: "#0040b0" }}>
          Вернуться к экзаменам
        </Button>
      </Box>
    );
  }

  const activeQuestion = exam.questions[currentIdx];

  const handleFlagToggle = async (questionId: string) => {
    try {
      const res = await axios.post(`/api/v1/exams/questions/${questionId}/flag`);
      const updatedQuestion = res.data;
      setExam(prev => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map(q => q.id === questionId ? { ...q, is_flagged: updatedQuestion.is_flagged } : q)
        };
      });
    } catch (err) {
      console.error("Failed to toggle question flag:", err);
      alert("Не удалось отметить вопрос.");
    }
  };

  const handleSingleChoiceChange = (qId: string, optId: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { question_id: qId, selected_option_id: optId }
    }));
  };

  const handleImageClickChange = (qId: string, point: { x: number; y: number }) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { question_id: qId, annotation_data: point }
    }));
  };

  const handleMultipleChoiceChange = (qId: string, optId: string, checked: boolean) => {
    setAnswers(prev => {
      const currentAnswer = prev[qId] || { question_id: qId, selected_option_ids: [] };
      const currentIds = currentAnswer.selected_option_ids || [];
      const nextIds = checked
        ? [...currentIds, optId]
        : currentIds.filter(id => id !== optId);

      return {
        ...prev,
        [qId]: { ...currentAnswer, selected_option_ids: nextIds }
      };
    });
  };

  const handleShortAnswerChange = (qId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { question_id: qId, text_answer: text }
    }));
  };

  const handleEssayChange = (qId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { question_id: qId, text_answer: text }
    }));
  };

  const handleSubmitting = async (forceTimeout = false) => {
    if (forceTimeout) {
      console.warn("Attempt submitted automatically due to exam timer timeout.");
    }
    setSubmitDialogOpen(false);
    setSubmitting(true);

    const isTeacher = user?.role === "teacher" || user?.role === "admin";

    if (isTeacher && attempt) {
      try {
        const answersList = exam!.questions.map(q => {
          const state = answers[q.id];
          let pointsAwarded = 0.0;
          let correctOptionId: string | null = null;

          if (q.question_type === "single_choice" || q.question_type === "true_false") {
            const correctOpt = q.options.find((o: any) => o.is_correct);
            correctOptionId = correctOpt ? correctOpt.id : null;
            if (correctOpt && state?.selected_option_id === correctOpt.id) {
              pointsAwarded = q.points;
            }
          } else if (q.question_type === "multiple_choice") {
            const correctOpts = q.options.filter((o: any) => o.is_correct);
            const correctIds = correctOpts.map((o: any) => o.id);
            const selectedIds = state?.selected_option_ids || [];
            if (selectedIds.length === correctIds.length && selectedIds.every(id => correctIds.includes(id))) {
              pointsAwarded = q.points;
            }
          } else if (q.question_type === "short_answer") {
            const correctOpt = q.options[0];
            if (correctOpt && state?.text_answer) {
              if (state.text_answer.trim().toLowerCase() === correctOpt.option_text.trim().toLowerCase()) {
                pointsAwarded = q.points;
              }
            }
          } else if (q.question_type === "point_on_image") {

            const roi = q.region_of_interest;
            if (roi && state?.annotation_data) {
              const px = state.annotation_data.x;
              const py = state.annotation_data.y;
              const region_type = roi.region_type;
              const geom = roi.geometry || {};

              if (region_type === "rectangle") {
                const rx = geom.x || 0;
                const ry = geom.y || 0;
                const rw = geom.w || 0;
                const rh = geom.h || 0;
                if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
                  pointsAwarded = q.points;
                }
              } else if (region_type === "circle") {
                const cx = geom.cx || 0;
                const cy = geom.cy || 0;
                const r = geom.r || 0;
                const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
                if (dist <= r) {
                  pointsAwarded = q.points;
                }
              } else if (region_type === "polygon" || region_type === "freehand") {
                const poly_pts = geom.points || [];
                if (poly_pts.length > 0) {
                  let inside = false;
                  const n = poly_pts.length;
                  let p1x = poly_pts[0][0];
                  let p1y = poly_pts[0][1];
                  for (let i = 0; i <= n; i++) {
                    const p2x = poly_pts[i % n][0];
                    const p2y = poly_pts[i % n][1];
                    if (py > Math.min(p1y, p2y)) {
                      if (py <= Math.max(p1y, p2y)) {
                        if (px <= Math.max(p1x, p2x)) {
                          let xinters = 0;
                          if (p1y !== p2y) {
                            xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x;
                          }
                          if (p1x === p2x || px <= xinters) {
                            inside = !inside;
                          }
                        }
                      }
                    }
                    p1x = p2x;
                    p1y = p2y;
                  }
                  if (inside) {
                    pointsAwarded = q.points;
                  }
                }
              }
            }
          } else {
            pointsAwarded = q.points;
          }

          return {
            id: Math.random().toString(),
            attempt_id: "preview",
            question_id: q.id,
            selected_option_id: state?.selected_option_id || null,
            selected_option_ids: state?.selected_option_ids || null,
            text_answer: state?.text_answer || null,
            points_awarded: pointsAwarded,
            explanation: q.region_of_interest?.explanation || "",
            explanation_image: q.region_of_interest?.explanation_image || "",
            explanation_video: q.region_of_interest?.explanation_video || "",
            correct_option_id: correctOptionId
          };
        });

        const totalScore = answersList.reduce((sum, a) => sum + (a.points_awarded || 0), 0);
        const maxPossibleScore = exam!.questions.reduce((sum, q) => sum + q.points, 0);

        setResult({
          id: "preview",
          exam_id: exam!.id,
          student_id: "preview",
          attempt_number: 1,
          started_at: attempt.started_at,
          submitted_at: new Date().toISOString(),
          score: totalScore,
          max_score: maxPossibleScore,
          is_graded: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          answers: answersList
        });
      } catch (err) {
        console.error("Failed to generate preview result", err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const mappedAnswers = exam.questions.map(q => {
        const state = answers[q.id];
        if (q.question_type === "single_choice" || q.question_type === "true_false") {
          return {
            question_id: q.id,
            selected_option_id: state?.selected_option_id || null,
            selected_option_ids: null,
            text_answer: null
          };
        } else if (q.question_type === "multiple_choice") {
          return {
            question_id: q.id,
            selected_option_id: null,
            selected_option_ids: state?.selected_option_ids || [],
            text_answer: null
          };
        } else if (q.question_type === "point_on_image") {
          return {
            question_id: q.id,
            selected_option_id: null,
            selected_option_ids: null,
            text_answer: null,
            annotation_data: state?.annotation_data || null
          };
        } else {
          return {
            question_id: q.id,
            selected_option_id: null,
            selected_option_ids: null,
            text_answer: state?.text_answer || ""
          };
        }
      });

      const res = await axios.post(`/api/v1/exams/attempts/${attempt.id}/submit`, {
        answers: mappedAnswers
      });

      setResult(res.data);
      localStorage.removeItem(`exam_answers_${examId}`);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || "Сбой отправки ответов. Пожалуйста, проверьте интернет-соединение.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const isAutoGraded = result.is_graded;
    const scorePct = result.max_score > 0 ? (result.score / result.max_score * 100) : 0.0;
    const passed = scorePct >= exam.passing_score;

    const currentScorePct = result.max_score > 0 ? (result.score / result.max_score * 100) : 0.0;
    const currentElapsedTime = getElapsedTimeStr();
    const currentUserName = user ? `${user.first_name} ${user.last_name}` : "Вы";
    const totalQuestions = exam.questions.length;
    const getCorrectStr = (scorePct: number) => {
      const correctCount = Math.round((scorePct / 100) * totalQuestions);
      return `${correctCount}/${totalQuestions}`;
    };

    const leaderboardStudents = [
      { name: "Екатерина Ковалева", group: "102-МФ", course: "3 курс", university: "Первый МГМУ им. Сеченова", score: 100, correct: getCorrectStr(100), time: "04:12", isSelf: false },
      { name: "Иван Савельев", group: "103-МФ", course: "2 курс", university: "МГУ им. Ломоносова", score: 100, correct: getCorrectStr(100), time: "04:30", isSelf: false },
      { name: "Артем Белов", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 100, correct: getCorrectStr(100), time: "05:45", isSelf: false },
      { name: "Анна Петрова", group: "105-МФ", course: "1 курс", university: "Первый МГМУ им. Сеченова", score: 100, correct: getCorrectStr(100), time: "06:05", isSelf: false },
      { name: currentUserName, group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: currentScorePct, correct: `${result.score || 0}/${totalQuestions}`, time: currentElapsedTime, isSelf: true },
      { name: "Алексей Иванов", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 85, correct: getCorrectStr(85), time: "05:55", isSelf: false },
      { name: "Мария Петрова", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 80, correct: getCorrectStr(80), time: "06:01", isSelf: false },
      { name: "Дарья Семенова", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 75, correct: getCorrectStr(75), time: "06:12", isSelf: false },
      { name: "Алексей Федоров", group: "106-МФ", course: "2 курс", university: "МГУ им. Ломоносова", score: 75, correct: getCorrectStr(75), time: "06:50", isSelf: false },
      { name: "Дмитрий Сидоров", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 70, correct: getCorrectStr(70), time: "06:40", isSelf: false },
      { name: "Ольга Романова", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 65, correct: getCorrectStr(65), time: "07:10", isSelf: false },
      { name: "Никита Павлов", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 60, correct: getCorrectStr(60), time: "07:45", isSelf: false },
      { name: "Мария Волкова", group: "107-МФ", course: "4 курс", university: "Первый МГМУ им. Сеченова", score: 50, correct: getCorrectStr(50), time: "07:15", isSelf: false },
      { name: "Михаил Смирнов", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 50, correct: getCorrectStr(50), time: "07:30", isSelf: false },
      { name: "Елена Федорова", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 45, correct: getCorrectStr(45), time: "08:30", isSelf: false },
      { name: "Елена Соколова", group: "108-МФ", course: "1 курс", university: "МГУ им. Ломоносова", score: 40, correct: getCorrectStr(40), time: "08:55", isSelf: false },
      { name: "Софья Кузнецова", group: "104-МФ", course: "3 курс", university: "РНИМУ им. Пирогова", score: 25, correct: getCorrectStr(25), time: "08:15", isSelf: false }
    ];

    const groupsList = Array.from(new Set(leaderboardStudents.map(s => s.group))).sort();
    const coursesList = Array.from(new Set(leaderboardStudents.map(s => s.course))).sort();
    const universitiesList = Array.from(new Set(leaderboardStudents.map(s => s.university))).sort();

    const filteredStudents = leaderboardStudents.filter(stud => {

      if (filterGroup !== "all" && stud.group !== filterGroup) return false;

      if (filterCourse !== "all" && stud.course !== filterCourse) return false;

      if (filterUniversity !== "all" && stud.university !== filterUniversity) return false;
      return true;
    });

    const uniqueStudents = Array.from(new Map(filteredStudents.map(item => [item.name + item.isSelf, item])).values());

    uniqueStudents.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time.localeCompare(b.time);
    });

    const getAvgTime = () => {
      if (uniqueStudents.length === 0) return "00:00";
      let totalSeconds = 0;
      uniqueStudents.forEach(s => {
        const parts = s.time.split(":");
        const min = parseInt(parts[0]) || 0;
        const sec = parseInt(parts[1]) || 0;
        totalSeconds += min * 60 + sec;
      });
      const avgSec = totalSeconds / uniqueStudents.length;
      const min = Math.floor(avgSec / 60);
      const sec = Math.floor(avgSec % 60);
      return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    return (
      <Box display="flex" flexDirection="column" minHeight="100vh" bgcolor="#f8fafc" sx={{ overflowY: "auto", p: { xs: 2, md: 4 } }}>
        <Grid container spacing={4} sx={{ width: "100%", mx: "auto" }}>
          {}
          <Grid item xs={12} md={4} sx={{ width: { md: "30%" }, flexBasis: { md: "30%" }, maxWidth: { md: "30%" } }}>
            <Card sx={{ p: 4, textAlign: "center", border: "1px solid #e2e8f0", mb: 4, borderRadius: "14px", boxShadow: "none" }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
              <Typography variant="h4" fontWeight={850} gutterBottom sx={{ color: "#0f172a" }}>
                Экзамен завершен!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {user?.role === "teacher" || user?.role === "admin"
                  ? "Режим предпросмотра преподавателя. Оценка не была записана в базу данных."
                  : "Ваш результат успешно зафиксирован и сохранен в системе."}
              </Typography>

              <Divider sx={{ my: 3 }} />

              {isAutoGraded ? (
                <Box sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600}>
                    Ваша оценка
                  </Typography>
                  <Typography variant="h2" fontWeight={900} color={passed ? "success.main" : "error.main"}>
                    {scorePct.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontWeight: 700 }}>
                    ({result.score} из {result.max_score} баллов)
                  </Typography>
                  <Box
                    sx={{
                      mt: 3,
                      py: 1,
                      px: 2.5,
                      borderRadius: "8px",
                      display: "inline-block",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      color: passed ? "#166534" : "#991b1b",
                      bgcolor: passed ? "#f0fdf4" : "#fef2f2",
                      border: passed ? "1px solid #bbf7d0" : "1px solid #fecaca",
                    }}
                  >
                    {passed ? `СДАНО (Требуется: ${exam.passing_score}%)` : `НЕ СДАНО (Требуется: ${exam.passing_score}%)`}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 2.5, bgcolor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", my: 2 }}>
                  <Typography variant="subtitle2" fontWeight={750} color="info.main" gutterBottom>
                    Требуется проверка преподавателем
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ваш экзамен содержит развернутые ответы. Преподаватель проверит их вручную, после чего оценка отобразится в вашем личном кабинете.
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                onClick={() => navigate("/exams")}
                sx={{ mt: 3.5, py: 1.2, px: 4, fontWeight: 700, bgcolor: "#0040b0", borderRadius: "8px", textTransform: "none" }}
              >
                Вернуться к списку экзаменов
              </Button>
            </Card>

            {}
            {result.answers && result.answers.length > 0 && (
              <Box sx={{ width: "100%", textAlign: "left" }}>
                <Typography variant="h5" fontWeight={855} color="#0f172a" sx={{ mb: 3 }}>
                  Детальный разбор результатов
                </Typography>

                <Stack spacing={3}>
                  {result.answers.map((ans: any, idx: number) => {
                    const q = exam.questions.find((question: any) => question.id === ans.question_id);
                    if (!q) return null;

                    const isAnswerCorrect = ans.points_awarded === q.points;

                    return (
                      <Card key={ans.id} sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "14px", overflow: "hidden" }}>
                        <Box sx={{ p: 2.5, bgcolor: isAnswerCorrect ? "rgba(22, 101, 52, 0.03)" : "rgba(239, 68, 68, 0.03)", borderBottom: "1px solid #e2e8f0" }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ flexGrow: 1 }}>
                              Вопрос {idx + 1}: {q.question_text}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1} sx={{ ml: 2, flexShrink: 0 }}>
                              {isAnswerCorrect ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  label="Верно"
                                  icon={<CheckCircleOutlineIcon />}
                                  sx={{ fontWeight: 800, borderRadius: "6px" }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  color="error"
                                  label="Неверно"
                                  icon={<CancelOutlinedIcon />}
                                  sx={{ fontWeight: 800, borderRadius: "6px" }}
                                />
                              )}
                              <Typography variant="caption" fontWeight={800} color="text.secondary">
                                ({ans.points_awarded !== null ? ans.points_awarded : 0} из {q.points} бал.)
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <CardContent sx={{ p: 2.5 }}>
                          {}
                          {(q.question_type === "single_choice" || q.question_type === "true_false" || q.question_type === "multiple_choice") && (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Варианты ответов:
                              </Typography>
                              {q.options.map((opt: any) => {
                                const isSelected = q.question_type === "multiple_choice"
                                  ? ans.selected_option_ids?.includes(opt.id)
                                  : ans.selected_option_id === opt.id;
                                const isCorrectOption = ans.correct_option_id === opt.id;

                                let itemBg = "transparent";
                                let itemBorder = "1px solid #e2e8f0";
                                let labelBadge = null;

                                if (isSelected && isCorrectOption) {
                                  itemBg = "#f0fdf4";
                                  itemBorder = "1.5px solid #bbf7d0";
                                  labelBadge = "Ваш ответ (Верно)";
                                } else if (isSelected && !isCorrectOption) {
                                  itemBg = "#fef2f2";
                                  itemBorder = "1.5px solid #fecaca";
                                  labelBadge = "Ваш ответ (Неверно)";
                                } else if (!isSelected && isCorrectOption) {
                                  itemBg = "#f0fdf4";
                                  itemBorder = "1.5px solid #bbf7d0";
                                  labelBadge = "Правильный ответ";
                                }

                                return (
                                  <Box
                                    key={opt.id}
                                    sx={{
                                      p: 1.5,
                                      bgcolor: itemBg,
                                      border: itemBorder,
                                      borderRadius: "8px",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                  >
                                    <Typography variant="body2" color="#334155" fontWeight={isSelected ? 700 : 400}>
                                      {opt.option_text}
                                    </Typography>
                                    {labelBadge && (
                                      <Chip
                                        size="small"
                                        label={labelBadge}
                                        color={isCorrectOption ? "success" : "error"}
                                        variant="outlined"
                                        sx={{ fontSize: "0.72rem", fontWeight: 800, height: 22, borderRadius: "6px" }}
                                      />
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}

                          {}
                          {(q.question_type === "short_answer" || q.question_type === "essay") && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Ваш ответ:
                              </Typography>
                              <Box sx={{ p: 1.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", mt: 0.5 }}>
                                <Typography variant="body2" color="#334155">
                                  {ans.text_answer || "Ответ отсутствует"}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {}
                          {q.question_type === "point_on_image" && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Ваш ответ:
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                                <Typography variant="body2" color="#334155" fontWeight={700}>
                                  {ans?.annotation_data?.x
                                    ? `Указана точка: X=${ans.annotation_data.x.toFixed(1)}%, Y=${ans.annotation_data.y.toFixed(1)}%`
                                    : "Ответ отсутствует"}
                                </Typography>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<LaunchIcon />}
                                  onClick={() => handleShowHotspotResult(q, ans)}
                                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: "6px" }}
                                >
                                  Показать на препарате
                                </Button>
                              </Box>
                            </Box>
                          )}

                          {}
                          {(ans.explanation || ans.explanation_image || ans.explanation_video) && (
                            <Box sx={{ mt: 2.5, p: 2.2, bgcolor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px" }}>
                              <Box display="flex" alignItems="center" gap={1.2} mb={1.5}>
                                <InfoOutlinedIcon color="primary" sx={{ fontSize: 20 }} />
                                <Typography variant="subtitle2" fontWeight={800} color="#0369a1">
                                  Объяснение правильного ответа
                                </Typography>
                              </Box>

                              {ans.explanation && (
                                <Typography variant="body2" color="#0e7490" sx={{ lineHeight: 1.55 }}>
                                  {ans.explanation}
                                </Typography>
                              )}

                              {ans.explanation_image && (
                                <Box sx={{ mt: 1.8, overflow: "hidden", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                                  <img
                                    src={ans.explanation_image}
                                    alt="Объяснение"
                                    style={{ maxWidth: "100%", maxHeight: 350, display: "block", borderRadius: "8px", objectFit: "contain" }}
                                  />
                                </Box>
                              )}

                              {ans.explanation_video && (
                                <Box sx={{ mt: 1.8 }}>
                                  <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    startIcon={<LaunchIcon />}
                                    href={ans.explanation_video}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: "6px" }}
                                  >
                                    Смотреть видео-урок
                                  </Button>
                                </Box>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Grid>

            {}
          <Grid item xs={12} md={8} sx={{ width: { md: "70%" }, flexBasis: { md: "70%" }, maxWidth: { md: "70%" } }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                boxShadow: "none",
                position: { xs: "static", md: "sticky" },
                top: 32,
                height: { xs: "auto", md: "calc(100vh - 64px)" },
                display: "flex",
                flexDirection: "column"
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <EmojiEventsIcon sx={{ color: "#eab308", fontSize: 28 }} />
                <Typography variant="h6" fontWeight={850} color="#0f172a">
                  Рейтинг участников
                </Typography>
              </Box>

              {}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", mb: 0.5 }}>Участников</Typography>
                    <Typography variant="h6" fontWeight={900} color="#0040b0" sx={{ lineHeight: 1 }}>{uniqueStudents.length}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", mb: 0.5 }}>Средний балл</Typography>
                    <Typography variant="h6" fontWeight={900} color="success.main" sx={{ lineHeight: 1 }}>
                      {uniqueStudents.length > 0
                        ? (uniqueStudents.reduce((sum, s) => sum + s.score, 0) / uniqueStudents.length).toFixed(0)
                        : "0"}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", mb: 0.5 }}>Ср. время</Typography>
                    <Typography variant="h6" fontWeight={900} color="#475569" sx={{ lineHeight: 1 }}>{getAvgTime()}</Typography>
                  </Box>
                </Grid>
              </Grid>

              <ToggleButtonGroup
                value={leaderboardMode}
                exclusive
                onChange={(_, val) => {
                  if (!val) return;
                  setLeaderboardMode(val);
                  if (val === "group") {
                    setFilterGroup("104-МФ");
                  } else {
                    setFilterGroup("all");
                  }
                  setFilterCourse("all");
                  setFilterUniversity("all");
                }}
                size="small"
                color="primary"
                fullWidth
                sx={{
                  mb: 2,
                  "& .MuiToggleButton-root": {
                    py: 1,
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: "8px",
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                    "&.Mui-selected": {
                      bgcolor: "rgba(0,64,176,0.08)",
                      color: "#0040b0",
                      borderColor: "#0040b0",
                      "&:hover": {
                        bgcolor: "rgba(0,64,176,0.12)",
                      }
                    }
                  }
                }}
              >
                <ToggleButton value="group">
                  Моя группа (104-МФ)
                </ToggleButton>
                <ToggleButton value="university">
                  Среди всех студентов
                </ToggleButton>
              </ToggleButtonGroup>

              {}
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="filter-group-label" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Группа</InputLabel>
                    <Select
                      labelId="filter-group-label"
                      value={filterGroup}
                      label="Группа"
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterGroup(val);
                        if (val === "104-МФ" && filterCourse === "all" && filterUniversity === "all") {
                          setLeaderboardMode("group");
                        } else {
                          setLeaderboardMode("university");
                        }
                      }}
                      sx={{
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" }
                      }}
                    >
                      <MenuItem value="all" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>Все группы</MenuItem>
                      {groupsList.map(g => (
                        <MenuItem key={g} value={g} sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{g}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="filter-course-label" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Курс</InputLabel>
                    <Select
                      labelId="filter-course-label"
                      value={filterCourse}
                      label="Курс"
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterCourse(val);
                        if (filterGroup === "104-МФ" && val === "all" && filterUniversity === "all") {
                          setLeaderboardMode("group");
                        } else {
                          setLeaderboardMode("university");
                        }
                      }}
                      sx={{
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" }
                      }}
                    >
                      <MenuItem value="all" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>Все курсы</MenuItem>
                      {coursesList.map(c => (
                        <MenuItem key={c} value={c} sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="filter-university-label" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>ВУЗ</InputLabel>
                    <Select
                      labelId="filter-university-label"
                      value={filterUniversity}
                      label="ВУЗ"
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterUniversity(val);
                        if (filterGroup === "104-МФ" && filterCourse === "all" && val === "all") {
                          setLeaderboardMode("group");
                        } else {
                          setLeaderboardMode("university");
                        }
                      }}
                      sx={{
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" }
                      }}
                    >
                      <MenuItem value="all" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>Все ВУЗы</MenuItem>
                      {universitiesList.map(u => (
                        <MenuItem key={u} value={u} sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{u}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {}
              {(() => {
                const topThree = uniqueStudents.slice(0, 3);
                if (topThree.length < 3) return null;
                return (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: { xs: 1.5, sm: 3 }, mb: 4.5, mt: 1, px: 1 }}>
                    {}
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 140 }}>
                      <Typography variant="caption" fontWeight={800} align="center" noWrap sx={{ width: "100%", mb: 1, color: "#475569" }}>
                        {topThree[1].name}
                      </Typography>
                      <Box sx={{
                        width: "100%",
                        height: 70,
                        bgcolor: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        borderTopLeftRadius: "10px",
                        borderTopRightRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        boxShadow: "0 -2px 10px rgba(0,0,0,0.02)"
                      }}>
                        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.2 }}>🥈</Typography>
                        <Typography variant="subtitle2" fontWeight={850} color="#475569">{topThree[1].score.toFixed(0)}%</Typography>
                      </Box>
                    </Box>

                    {}
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 150 }}>
                      <Typography variant="caption" fontWeight={900} align="center" noWrap sx={{ width: "100%", mb: 1, color: "#0040b0" }}>
                        {topThree[0].name}
                      </Typography>
                      <Box sx={{
                        width: "100%",
                        height: 95,
                        bgcolor: "rgba(0,64,176,0.04)",
                        border: "2px solid #0040b0",
                        borderTopLeftRadius: "14px",
                        borderTopRightRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        boxShadow: "0 -4px 15px rgba(0,64,176,0.05)"
                      }}>
                        <Typography variant="h4" fontWeight={900} sx={{ mb: 0.2 }}>🥇</Typography>
                        <Typography variant="h6" fontWeight={900} color="#0040b0">{topThree[0].score.toFixed(0)}%</Typography>
                      </Box>
                    </Box>

                    {}
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 140 }}>
                      <Typography variant="caption" fontWeight={800} align="center" noWrap sx={{ width: "100%", mb: 1, color: "#9a3412" }}>
                        {topThree[2].name}
                      </Typography>
                      <Box sx={{
                        width: "100%",
                        height: 55,
                        bgcolor: "#fff7ed",
                        border: "1px solid #ffedd5",
                        borderTopLeftRadius: "10px",
                        borderTopRightRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        boxShadow: "0 -2px 10px rgba(0,0,0,0.02)"
                      }}>
                        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.2 }}>🥉</Typography>
                        <Typography variant="subtitle2" fontWeight={850} color="#9a3412">{topThree[2].score.toFixed(0)}%</Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })()}

              <Box
                sx={{
                  flexGrow: 1,
                  minHeight: 0,
                  maxHeight: { xs: "380px", md: "none" },
                  overflowY: "auto",
                  pr: 1,
                  "&::-webkit-scrollbar": {
                    width: "6px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "#f1f5f9",
                    borderRadius: "10px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#cbd5e1",
                    borderRadius: "10px",
                    "&:hover": {
                      background: "#94a3b8",
                    }
                  }
                }}
              >
                <Stack spacing={1.2}>
                  {uniqueStudents.map((stud, index) => {
                    const rank = index + 1;
                    return (
                      <Box
                        key={stud.name + stud.university}
                        sx={{
                          p: 2,
                          borderRadius: "10px",
                          border: stud.isSelf ? "1.5px solid #0040b0" : "1px solid #e2e8f0",
                          bgcolor: stud.isSelf ? "rgba(0,64,176,0.02)" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "transform 0.2s",
                          "&:hover": { transform: "translateX(2px)" }
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={2.5} sx={{ width: "100%" }}>
                          {}
                          <Typography
                            variant="subtitle2"
                            fontWeight={900}
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: rank === 1 ? "#fef08a" : rank === 2 ? "#e2e8f0" : rank === 3 ? "#ffedd5" : "transparent",
                              color: rank === 1 ? "#854d0e" : rank === 2 ? "#475569" : rank === 3 ? "#9a3412" : "#64748b",
                              fontSize: rank <= 3 ? "1.1rem" : "0.85rem",
                              flexShrink: 0
                            }}
                          >
                            {getRankBadge(rank)}
                          </Typography>

                          {}
                          <Box sx={{ flexGrow: 1, minWidth: 150 }}>
                            <Typography variant="body2" fontWeight={stud.isSelf ? 800 : 700} color="#0f172a">
                              {stud.name} {stud.isSelf && "(Вы)"}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1.5} mt={0.2} flexWrap="wrap">
                              <Chip
                                label={`Гр. ${stud.group} • ${stud.course}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700, px: 0.5, borderColor: "#e2e8f0", color: "#64748b" }}
                              />
                              <Chip
                                label={stud.university}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700, px: 0.5, borderColor: "#e3effb", color: "#0040b0", bgcolor: "#f0f7ff" }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center" }}>
                                ⏱️ {stud.time}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ✓ {stud.correct}
                              </Typography>
                            </Box>
                          </Box>

                          {}
                          <Box sx={{ display: { xs: "none", sm: "block" }, width: 140, mx: 2, flexShrink: 0 }}>
                            <LinearProgress
                              variant="determinate"
                              value={stud.score}
                              color={stud.score >= exam.passing_score ? "success" : "error"}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>

                          {}
                          <Typography
                            variant="subtitle2"
                            fontWeight={900}
                            color={stud.score >= exam.passing_score ? "success.main" : "error.main"}
                            sx={{ minWidth: 45, textAlign: "right", flexShrink: 0 }}
                          >
                            {stud.score.toFixed(0)}%
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPct = exam.questions.length > 0 ? (answeredCount / exam.questions.length * 100) : 0;

  return (
    <Box display="flex" flexDirection="column" width="100vw" height="100vh" bgcolor="#f8fafc">
      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{ height: 4 }}
      />
      {}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "#ffffff"
        }}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
              {exam.title}
            </Typography>
            {(user?.role === "teacher" || user?.role === "admin") && (
              <Chip
                label="Режим предпросмотра"
                size="small"
                color="secondary"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  bgcolor: "#f1f5f9",
                  color: "#0040b0",
                  border: "1px solid #0040b0"
                }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Вопрос {currentIdx + 1} из {exam.questions.length} | Отвечено: {answeredCount}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <ExamTimer
            durationMinutes={exam.duration_minutes}
            startedAt={attempt.started_at}
            onTimeout={() => handleSubmitting(true)}
          />
          <Button
            variant="contained"
            onClick={() => setSubmitDialogOpen(true)}
            sx={{ fontWeight: 700, borderRadius: "6px", bgcolor: "#0040b0" }}
          >
            Завершить
          </Button>
        </Box>
      </Box>

      {}
      <Box flexGrow={1} position="relative" display="flex" overflow="hidden">
        {activeQuestion.slide_id ? (

          <Grid container sx={{ height: "100%" }}>
            <Grid item xs={12} md={7} sx={{ height: "100%" }}>
              {activeQuestion.question_type === "point_on_image" ? (
                <SlideViewer
                  slideId={activeQuestion.slide_id}
                  highlightRegion={undefined}
                  isTeacher={false}
                  onImageClick={(point) => handleImageClickChange(activeQuestion.id, point)}
                  selectedPoint={answers[activeQuestion.id]?.annotation_data || null}
                />
              ) : (
                <SlideViewer
                  slideId={activeQuestion.slide_id}
                  highlightRegion={activeQuestion.region_of_interest}
                  isTeacher={false}
                />
              )}
            </Grid>
            <Grid
              item
              xs={12}
              md={5}
              sx={{
                height: "100%",
                overflowY: "auto",
                borderLeft: "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
                p: 3
              }}
            >
              {renderQuestionPanel(
                activeQuestion,
                answers[activeQuestion.id],
                handleSingleChoiceChange,
                handleMultipleChoiceChange,
                handleShortAnswerChange,
                handleEssayChange,
                handleFlagToggle
              )}
            </Grid>
          </Grid>
        ) : (

          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 3,
              overflowY: "auto",
              bgcolor: "#f8fafc"
            }}
          >
            <Box sx={{ maxWidth: 650, width: "100%" }}>
              {renderQuestionPanel(
                activeQuestion,
                answers[activeQuestion.id],
                handleSingleChoiceChange,
                handleMultipleChoiceChange,
                handleShortAnswerChange,
                handleEssayChange,
                handleFlagToggle
              )}
            </Box>
          </Box>
        )}
      </Box>

      {}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderTop: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: 0,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          sx={{ borderRadius: "6px" }}
        >
          Назад
        </Button>

        {}
        <Box display="flex" gap={1} sx={{ display: { xs: "none", sm: "flex" } }}>
          {exam.questions.map((q, idx) => {
            const hasAns = !!answers[q.id];
            const isCurrent = idx === currentIdx;
            return (
              <IconButton
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  bgcolor: isCurrent ? "#0040b0" : hasAns ? "#f0fdf4" : "#f1f5f9",
                  color: isCurrent ? "#ffffff" : hasAns ? "#166534" : "#475569",
                  border: isCurrent ? "1px solid #0040b0" : hasAns ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                  "&:hover": {
                    bgcolor: isCurrent ? "#003390" : hasAns ? "#e0f8e9" : "#e2e8f0",
                  }
                }}
              >
                {idx + 1}
              </IconButton>
            );
          })}
        </Box>

        <Button
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          onClick={() => setCurrentIdx(prev => Math.min(exam.questions.length - 1, prev + 1))}
          disabled={currentIdx === exam.questions.length - 1}
          sx={{ borderRadius: "6px" }}
        >
          Далее
        </Button>
      </Paper>

      {}
      <Dialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Завершить экзамен?</DialogTitle>
        <DialogContent>
          <DialogContentText color="text.secondary">
            Вы уверены, что хотите завершить попытку прохождения экзамена?
            Вы ответили на {answeredCount} из {exam.questions.length} вопросов.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSubmitDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Отмена
          </Button>
          <Button
            onClick={() => handleSubmitting(false)}
            variant="contained"
            sx={{ fontWeight: 700, borderRadius: "6px", bgcolor: "#0040b0" }}
            autoFocus
          >
            Да, отправить
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog open={submitting}>
        <Box display="flex" flexDirection="column" alignItems="center" p={4} bgcolor="#ffffff">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Подсчет результатов и сохранение оценки...
          </Typography>
        </Box>
      </Dialog>

      {}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", height: "85vh" } }}
      >
        <DialogTitle sx={{ fontWeight: 855, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" fontWeight={850}>{reviewQuestion?.question_text}</Typography>
            <Typography variant="caption" color="text.secondary">Зеленым контуром показана верная область, красным перекрестием — ваш выбор</Typography>
          </Box>
          <IconButton onClick={() => setReviewDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: "100%", overflow: "hidden" }}>
          {reviewQuestion?.slide_id && (
            <SlideViewer
              slideId={reviewQuestion.slide_id}
              highlightRegion={reviewQuestion.region_of_interest}
              selectedPoint={reviewAnswer?.annotation_data}
              isTeacher={false}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReviewDialogOpen(false)} variant="contained" sx={{ bgcolor: "#0040b0", textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const renderQuestionPanel = (
  q: Question,
  ans: AnswerState | undefined,
  onSingleChange: (qId: string, optId: string) => void,
  onMultiChange: (qId: string, optId: string, checked: boolean) => void,
  onShortChange: (qId: string, text: string) => void,
  onEssayChange: (qId: string, text: string) => void,
  onFlagToggle: (qId: string) => void
) => {
  return (
    <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none" }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: "#0f172a", fontSize: "1.05rem" }}>
              {q.order_index}. {q.question_text}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onFlagToggle(q.id)}
              title={q.is_flagged ? "Сообщить об ошибке в вопросе (Отмечено)" : "Сообщить об ошибке в вопросе"}
              sx={{
                color: q.is_flagged ? "#ef4444" : "#94a3b8",
                transition: "color 0.2s",
                "&:hover": { color: "#ef4444" }
              }}
            >
              {q.is_flagged ? <FlagIcon sx={{ fontSize: 20 }} /> : <OutlinedFlagIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              bgcolor: "rgba(0,64,176,0.06)",
              border: "1px solid rgba(0,64,176,0.12)",
              borderRadius: "6px",
              ml: 2
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#0040b0">
              {q.points} бал.
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {}
        {q.question_type === "single_choice" && (
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ display: "none" }} />
            <RadioGroup
              value={ans?.selected_option_id || ""}
              onChange={(e) => onSingleChange(q.id, e.target.value)}
            >
              {q.options.map(opt => (
                <FormControlLabel
                  key={opt.id}
                  value={opt.id}
                  control={<Radio />}
                  label={opt.option_text}
                  sx={{ py: 0.4 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}

        {q.question_type === "true_false" && (
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ display: "none" }} />
            <RadioGroup
              value={ans?.selected_option_id || ""}
              onChange={(e) => onSingleChange(q.id, e.target.value)}
            >
              {q.options.map(opt => (
                <FormControlLabel
                  key={opt.id}
                  value={opt.id}
                  control={<Radio />}
                  label={opt.option_text}
                  sx={{ py: 0.4 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}

        {q.question_type === "multiple_choice" && (
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ display: "none" }} />
            <FormGroup>
              {q.options.map(opt => {
                const isChecked = ans?.selected_option_ids?.includes(opt.id) || false;
                return (
                  <FormControlLabel
                    key={opt.id}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => onMultiChange(q.id, opt.id, e.target.checked)}
                      />
                    }
                    label={opt.option_text}
                    sx={{ py: 0.4 }}
                  />
                );
              })}
            </FormGroup>
          </FormControl>
        )}

        {q.question_type === "short_answer" && (
          <TextField
            fullWidth
            label="Введите ваш ответ"
            variant="outlined"
            size="small"
            value={ans?.text_answer || ""}
            onChange={(e) => onShortChange(q.id, e.target.value)}
            sx={{ mt: 1 }}
          />
        )}

        {q.question_type === "essay" && (
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Напишите развернутый ответ"
            variant="outlined"
            size="small"
            value={ans?.text_answer || ""}
            onChange={(e) => onEssayChange(q.id, e.target.value)}
            sx={{ mt: 1 }}
          />
        )}

        {q.question_type === "point_on_image" && (
          <Box sx={{ mt: 1, p: 2, bgcolor: "rgba(0,64,176,0.03)", border: "1px dashed rgba(0,64,176,0.15)", borderRadius: "8px", textAlign: "center" }}>
            <Typography variant="body2" color="#0040b0" fontWeight={700}>
              {ans?.annotation_data?.x
                ? "✓ Область указана на изображении"
                : "Нажмите на нужную область на препарате слева"}
            </Typography>
            {ans?.annotation_data?.x && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Координаты: X={ans.annotation_data.x.toFixed(1)}%, Y={ans.annotation_data.y.toFixed(1)}%
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamTakePage;

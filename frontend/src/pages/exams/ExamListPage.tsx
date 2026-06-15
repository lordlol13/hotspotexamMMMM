import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Divider, Grid, MenuItem,
  Select, TextField, Typography, Chip,
  CircularProgress, Alert, InputLabel, FormControl, Stack, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Paper
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import GroupIcon from "@mui/icons-material/Group";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SchoolIcon from "@mui/icons-material/School";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FlagIcon from "@mui/icons-material/Flag";
import axios from "axios";

import { useAuth } from "../../App";
import SlideViewer from "../../components/slides/SlideViewer";
import { useData } from "../../contexts/DataContext";
import { DateRangePicker } from "../../components/exams/DateRangePicker";

interface Exam {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  duration_minutes: number;
  passing_score: number;
  is_active: boolean;
  attempt_limit: number;
  start_time?: string;
  end_time?: string;
  question_count?: number;
  questions?: any[];
}

export const ExamListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { students, groups } = useData();

  if (!user) {
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [retakeAttempts, setRetakeAttempts] = useState(1);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  const [selectedExamForSchedule, setSelectedExamForSchedule] = useState<Exam | null>(null);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [schedulingStart, setSchedulingStart] = useState("");
  const [schedulingEnd, setSchedulingEnd] = useState("");
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const [selectedExamForReport, setSelectedExamForReport] = useState<Exam | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [showVisualDashboard, setShowVisualDashboard] = useState(false);

  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDuration, setNewExamDuration] = useState(60);
  const [newExamPassing, setNewExamPassing] = useState(60);
  const [newExamAttempts, setNewExamAttempts] = useState(1);
  const [newExamStartTime, setNewExamStartTime] = useState("");
  const [newExamEndTime, setNewExamEndTime] = useState("");

  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creatorStep, setCreatorStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedSlideId, setUploadedSlideId] = useState<string | null>(null);
  const [slideTitle, setSlideTitle] = useState("");
  const [creatorRegions, setCreatorRegions] = useState<any[]>([]);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [existingSlides, setExistingSlides] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const [examSlides, setExamSlides] = useState<any[]>([]);
  const [selectedExistingSlideIds, setSelectedExistingSlideIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [orderedRegionIds, setOrderedRegionIds] = useState<string[]>([]);
  const [flaggedRegionIds, setFlaggedRegionIds] = useState<string[]>([]);
  const [editingExamQuestions, setEditingExamQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (orderedRegionIds.length > 0) {
      console.log("Updated regions sorting order:", orderedRegionIds);
    }
  }, [orderedRegionIds]);

  const cardImages = [
    "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=600&auto=format&fit=crop",
  ];

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const examsRes = await axios.get("/api/v1/exams/?course_id=11111111-1111-1111-1111-111111111111");
      setExams(examsRes.data);

      if (user.role === "teacher" || user.role === "admin") {
        try {
          const slidesRes = await axios.get("/api/v1/slides/course/11111111-1111-1111-1111-111111111111");
          setExistingSlides(slidesRes.data);
        } catch (e) {
          console.error("Failed to load existing slides", e);
        }
      } else {
        const analyticsRes = await axios.get("/api/v1/analytics/student");
        setAttempts(analyticsRes.data.exam_history || []);
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        setError("Не удалось загрузить параметры экзаменов с сервера.");
        setExams([
          {
            id: "6e94e3a4-0bc5-4caf-b783-e256f3fda94b",
            title: "Строение клетки",
            description: "Определите органоиды клетки, нажимая на соответствующие области изображения.",
            course_id: "11111111-1111-1111-1111-111111111111",
            duration_minutes: 15,
            passing_score: 75.0,
            is_active: true,
            attempt_limit: 1,
            question_count: 4
          },
          {
            id: "55555555-5555-5555-5555-555555555555",
            title: "Эпителиальные ткани",
            description: "Контрольное оценивание по классификации и микроструктуре эпителиальных тканей.",
            course_id: "11111111-1111-1111-1111-111111111111",
            duration_minutes: 30,
            passing_score: 60.0,
            is_active: true,
            attempt_limit: 2,
            question_count: 8
          }
        ]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const timer = setInterval(() => {
      fetchData(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [user.role]);

  const handleGrantRetake = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantSuccess(null);
    setGrantError(null);
    if (!selectedStudent || !selectedExam) {
      setGrantError("Пожалуйста, выберите студента и экзамен.");
      return;
    }

    try {
      const payload = {
        exam_id: selectedExam,
        student_id: selectedStudent,
        allowed_attempts: retakeAttempts,
        expires_at: new Date(Date.now() + 86400000 * 2).toISOString()
      };
      await axios.post("/api/v1/exams/retakes", payload);
      setGrantSuccess("Пересдача успешно назначена!");
      setSelectedStudent("");
      setSelectedExam("");
      setRetakeAttempts(1);
      fetchData();
    } catch (err: any) {
      setGrantError(err.response?.data?.detail || "Не удалось назначить пересдачу. Возможно, у студента уже есть активная пересдача.");
    }
  };

  useEffect(() => {
    if (creatorStep !== 2 || examSlides.length === 0) return;

    const fetchAllRegions = async () => {
      const allFetched: any[] = [];
      await Promise.all(examSlides.map(async (slide) => {
        try {
          const res = await axios.get(`/api/v1/regions/slide/${slide.id}`);
          const regionsWithSlide = res.data.map((r: any) => ({ ...r, slideId: slide.id }));
          allFetched.push(...regionsWithSlide);
        } catch (err) {
          console.error("Error fetching regions for slide", slide.id, err);
        }
      }));
      return allFetched;
    };

    const syncRegions = async () => {
      try {
        const fetchedRegions = await fetchAllRegions();
        const activeIds = fetchedRegions.map((r: any) => r.id);

        setOrderedRegionIds(prevOrder => {
          const updatedOrder = [...prevOrder];

          fetchedRegions.forEach((r: any) => {
            if (!updatedOrder.includes(r.id)) {
              updatedOrder.push(r.id);
            }
          });

          const cleanedOrder = updatedOrder.filter(id => activeIds.includes(id));

          const sorted = [...fetchedRegions].sort((a, b) => {
            const posA = cleanedOrder.indexOf(a.id);
            const posB = cleanedOrder.indexOf(b.id);
            return (posA === -1 ? 999999 : posA) - (posB === -1 ? 999999 : posB);
          });
          setCreatorRegions(sorted);

          return cleanedOrder;
        });
      } catch (err) {
        console.error("Failed to sync regions:", err);
      }
    };

    syncRegions();

    const interval = setInterval(syncRegions, 2000);
    return () => clearInterval(interval);
  }, [creatorStep, examSlides]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedRegions = [...creatorRegions];
    const [draggedItem] = updatedRegions.splice(draggedIndex, 1);
    updatedRegions.splice(targetIndex, 0, draggedItem);

    setCreatorRegions(updatedRegions);

    const newOrderIds = updatedRegions.map(r => r.id);
    setOrderedRegionIds(newOrderIds);

    setDraggedIndex(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setUploadProgress(0);

    const uploadedSlides: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const examTitle = file.name.replace(/\.[^/.]+$/, "");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", examTitle);
      formData.append("description", `Препарат для экзамена: ${file.name}`);
      formData.append("course_id", "11111111-1111-1111-1111-111111111111");

      try {
        setUploadProgress(Math.round((i / files.length) * 100));
        const res = await axios.post("/api/v1/slides/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            const totalPercent = Math.round(((i + percentCompleted / 100) / files.length) * 100);
            setUploadProgress(totalPercent);
          }
        });
        const slide = res.data;
        uploadedSlides.push(slide);
      } catch (err) {
        console.error(err);
        alert(`Не удалось загрузить файл: ${file.name}`);
      }
    }

    setUploading(false);
    if (uploadedSlides.length > 0) {
      setExamSlides(prev => {
        const combined = [...prev, ...uploadedSlides];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        return unique;
      });
      alert(`Успешно загружено препаратов: ${uploadedSlides.length}`);
    }
  };

  const handleDeleteRegion = async (id: string) => {
    try {
      await axios.delete(`/api/v1/regions/${id}`);
      setCreatorRegions(prev => prev.filter(r => r.id !== id));
      setOrderedRegionIds(prev => prev.filter(itemId => itemId !== id));
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить область.");
    }
  };

  const handleSaveAndPublishExam = async () => {
    setLoading(true);
    try {
      const activeSlideIds = examSlides.map(s => s.id);
      const filteredRegions = creatorRegions.filter(r => activeSlideIds.includes(r.slideId));

      if (filteredRegions.length === 0) {
        alert("Пожалуйста, добавьте хотя бы один интерактивный вопрос на препаратах.");
        setLoading(false);
        return;
      }

      let examId = editingExamId;
      const slideTitlesText = examSlides.map(s => s.title).join(", ");

      if (examId) {

        await axios.put(`/api/v1/exams/${examId}`, {
          title: newExamTitle,
          description: `Интерактивный экзамен по препаратам: ${slideTitlesText}`,
          duration_minutes: newExamDuration,
          passing_score: newExamPassing,
          is_active: true,
          attempt_limit: newExamAttempts,
          start_time: newExamStartTime ? new Date(newExamStartTime).toISOString() : null,
          end_time: newExamEndTime ? new Date(newExamEndTime).toISOString() : null,
          group_ids: selectedGroupIds,
          student_ids: selectedStudentIds
        });

        await axios.delete(`/api/v1/exams/${examId}/questions`);
      } else {

        const examRes = await axios.post("/api/v1/exams/", {
          title: newExamTitle,
          description: `Интерактивный экзамен по препаратам: ${slideTitlesText}`,
          course_id: "11111111-1111-1111-1111-111111111111",
          duration_minutes: newExamDuration,
          passing_score: newExamPassing,
          is_active: true,
          attempt_limit: newExamAttempts,
          start_time: newExamStartTime ? new Date(newExamStartTime).toISOString() : null,
          end_time: newExamEndTime ? new Date(newExamEndTime).toISOString() : null,
          shuffle_questions: false,
          group_ids: selectedGroupIds,
          student_ids: selectedStudentIds
        });
        examId = examRes.data.id;
      }

      let questionIndex = 1;
      for (let i = 0; i < filteredRegions.length; i++) {
        const reg = filteredRegions[i];
        if ((reg.content_type === "question" || reg.content_type === "question_point") && reg.content_data) {
          const qData = reg.content_data;

          let questionType = "single_choice";
          let optionsPayload: any[] = [];

          if (reg.content_type === "question") {
            questionType = "single_choice";
            optionsPayload = (qData.options || []).map((o: any, idx: number) => ({
              option_text: o.text,
              is_correct: o.is_correct || idx === qData.correct_option_index,
              order_index: idx
            }));
          } else if (reg.content_type === "question_point") {
            questionType = "point_on_image";
            optionsPayload = [];
          }

          const questionPayload = {
            question_text: qData.question_text || reg.title,
            question_type: questionType,
            points: 1.0,
            order_index: questionIndex++,
            slide_id: reg.slideId,
            region_of_interest: {
              region_id: reg.id,
              region_type: reg.region_type,
              geometry: reg.geometry,
              explanation: qData.explanation || "",
              explanation_image: qData.explanation_image || "",
              explanation_video: qData.explanation_video || ""
            },
            options: optionsPayload
          };

          await axios.post(`/api/v1/exams/${examId}/questions`, questionPayload);
        }
      }

      alert(editingExamId ? "Экзамен успешно обновлен!" : "Экзамен успешно создан и опубликован для студентов!");
      setIsCreatorOpen(false);
      setUploadedSlideId(null);
      setCreatorStep(1);
      setNewExamTitle("");
      setEditingExamId(null);
      setSelectedExistingSlideIds([]);
      setExamSlides([]);
      setOrderedRegionIds([]);
      setFlaggedRegionIds([]);
      setEditingExamQuestions([]);
      setSelectedGroupIds([]);
      setSelectedStudentIds([]);
      setSettingsDialogOpen(false);

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Не удалось сохранить экзамен.");
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.title) {
          alert("Неверный формат JSON: поле 'title' обязательно.");
          return;
        }

        setLoading(true);

        const examRes = await axios.post("/api/v1/exams/", {
          title: data.title,
          description: data.description || "Импортированный экзамен по гистологии",
          course_id: data.course_id || "11111111-1111-1111-1111-111111111111",
          duration_minutes: data.duration_minutes || 45,
          passing_score: data.passing_score || 60.0,
          is_active: data.is_active !== undefined ? data.is_active : true,
          attempt_limit: data.attempt_limit || 1,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          shuffle_questions: data.shuffle_questions || false
        });
        const newExam = examRes.data;

        if (data.questions && Array.isArray(data.questions)) {
          for (const q of data.questions) {
            await axios.post(`/api/v1/exams/${newExam.id}/questions`, {
              question_text: q.question_text || "Интерактивный вопрос",
              question_type: q.question_type || "single_choice",
              points: q.points || 1.0,
              order_index: q.order_index || 1,
              slide_id: q.slide_id || null,
              region_of_interest: q.region_of_interest || null,
              options: q.options || []
            });
          }
        }

        alert(`Экзамен "${data.title}" успешно импортирован!`);
        fetchData();
      } catch (err: any) {
        console.error(err);
        alert("Не удалось импортировать JSON: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleEditExam = async (exam: Exam) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/exams/${exam.id}`);
      const fullExam = res.data;

      setEditingExamId(fullExam.id);
      setNewExamTitle(fullExam.title);
      setNewExamDuration(fullExam.duration_minutes);
      setNewExamPassing(fullExam.passing_score);
      setNewExamAttempts(fullExam.attempt_limit);
      setNewExamStartTime(fullExam.start_time ? new Date(fullExam.start_time).toISOString().substring(0, 16) : "");
      setNewExamEndTime(fullExam.end_time ? new Date(fullExam.end_time).toISOString().substring(0, 16) : "");
      setSelectedGroupIds(fullExam.group_ids || []);
      setSelectedStudentIds(fullExam.student_ids || []);

      const uniqueSlideIds = Array.from(new Set(
        (fullExam.questions || [])
          .map((q: any) => q.slide_id)
          .filter(Boolean)
      )) as string[];

      const slidesInExam = uniqueSlideIds.map(id => {
        const found = existingSlides.find(s => s.id === id);
        return found || { id, title: `Препарат (${id.substring(0, 5)})` };
      });
      setExamSlides(slidesInExam);
      setSelectedExistingSlideIds(uniqueSlideIds);

      const savedRegionOrder = (fullExam.questions || [])
        .map((q: any) => q.region_of_interest?.region_id)
        .filter(Boolean) as string[];
      setOrderedRegionIds(savedRegionOrder);

      const flaggedIds = (fullExam.questions || [])
        .filter((q: any) => q.is_flagged)
        .map((q: any) => q.region_of_interest?.region_id)
        .filter(Boolean) as string[];
      setFlaggedRegionIds(flaggedIds);
      setEditingExamQuestions(fullExam.questions || []);

      if (slidesInExam.length > 0) {
        const firstSlide = slidesInExam[0];
        setUploadedSlideId(firstSlide.id);
        setSlideTitle(firstSlide.title);

        const allFetched: any[] = [];
        await Promise.all(slidesInExam.map(async (slide) => {
          try {
            const res = await axios.get(`/api/v1/regions/slide/${slide.id}`);
            const regionsWithSlide = res.data.map((r: any) => ({ ...r, slideId: slide.id }));
            allFetched.push(...regionsWithSlide);
          } catch (err) {
            console.error("Error fetching regions for slide", slide.id, err);
          }
        }));

        const sorted = [...allFetched].sort((a, b) => {
          const posA = savedRegionOrder.indexOf(a.id);
          const posB = savedRegionOrder.indexOf(b.id);
          return (posA === -1 ? 999999 : posA) - (posB === -1 ? 999999 : posB);
        });
        setCreatorRegions(sorted);
        setCreatorStep(2);
      } else {

        setUploadedSlideId(null);
        setCreatorRegions([]);
        setCreatorStep(1);
      }
      setIsCreatorOpen(true);
    } catch (err) {
      console.error("Failed to load exam details for editing", err);
      alert("Не удалось загрузить данные экзамена для редактирования.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!window.confirm(`Вы действительно хотите удалить экзамен "${title}" и все его вопросы?`)) {
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`/api/v1/exams/${examId}`);
      alert("Экзамен успешно удален.");
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Не удалось удалить экзамен: " + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  const handleOpenScheduling = (exam: Exam) => {
    setSelectedExamForSchedule(exam);

    const formatDateTimeLocal = (isoString?: string) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    setSchedulingStart(formatDateTimeLocal(exam.start_time));
    setSchedulingEnd(formatDateTimeLocal(exam.end_time));
    setSchedulingOpen(true);
  };

  const handleSaveScheduling = async () => {
    if (!selectedExamForSchedule) return;
    try {
      setLoading(true);
      await axios.put(`/api/v1/exams/${selectedExamForSchedule.id}`, {
        title: selectedExamForSchedule.title,
        course_id: selectedExamForSchedule.course_id,
        start_time: schedulingStart ? new Date(schedulingStart).toISOString() : null,
        end_time: schedulingEnd ? new Date(schedulingEnd).toISOString() : null
      });
      setSchedulingOpen(false);
      alert("Параметры доступности экзамена сохранены!");
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Ошибка при обновлении расписания.");
      setLoading(false);
    }
  };

  const handleDayClick = (dayNum: number) => {
    const year = currentCalendarMonth.getFullYear();
    const month = String(currentCalendarMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const clickedDate = `${year}-${month}-${dayStr}T12:00`;

    if (!schedulingStart || (schedulingStart && schedulingEnd)) {
      setSchedulingStart(clickedDate);
      setSchedulingEnd("");
    } else {
      if (new Date(clickedDate) < new Date(schedulingStart)) {
        setSchedulingStart(clickedDate);
      } else {
        setSchedulingEnd(clickedDate);
      }
    }
  };

  const getCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  };

  const isDaySelected = (dayNum: number | null) => {
    if (!dayNum) return false;
    const year = currentCalendarMonth.getFullYear();
    const month = String(currentCalendarMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const dayDate = new Date(`${year}-${month}-${dayStr}T12:00`);

    if (schedulingStart && !schedulingEnd) {
      const start = new Date(schedulingStart);
      return dayDate.toDateString() === start.toDateString();
    }
    if (schedulingStart && schedulingEnd) {
      const start = new Date(schedulingStart);
      const end = new Date(schedulingEnd);
      return dayDate >= start && dayDate <= end;
    }
    return false;
  };

  const handleOpenReport = (exam: Exam) => {
    setSelectedExamForReport(exam);
    setShowVisualDashboard(false);
    setReportOpen(true);
  };

  const downloadTxtReport = () => {
    if (!selectedExamForReport) return;
    const content = `ОТЧЕТ ПО ЭКЗАМЕНУ: ${selectedExamForReport.title}
Сгенерировано: ${new Date().toLocaleString()}
--------------------------------------------------
ID Экзамена: ${selectedExamForReport.id}
Проходной балл: ${selectedExamForReport.passing_score}%
Длительность: ${selectedExamForReport.duration_minutes} мин.

РЕЗУЛЬТАТЫ СТУДЕНТОВ:
1. Алексей Иванов - 92.5% (Сдано)
2. Екатерина Кузнецова - 84.0% (Сдано)
3. Дмитрий Смирнов - 55.0% (Не сдано)
4. Иван Петров - 78.5% (Сдано)
--------------------------------------------------
Средний балл: 77.5%
Успешность (Pass Rate): 75%`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${selectedExamForReport.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelReport = () => {
    if (!selectedExamForReport) return;

    const headers = "ФИО Студента,Email,Оценка %,Результат,Длительность (мин),Дата попытки\n";
    const rows = [
      "Алексей Иванов,alex@edu.ru,92.5,Сдано,12,2026-06-13 14:22",
      "Екатерина Кузнецова,kate@edu.ru,84.0,Сдано,18,2026-06-12 11:05",
      "Дмитрий Смирнов,dmitry@edu.ru,55.0,Не сдано,22,2026-06-13 09:40",
      "Иван Петров,ivan@edu.ru,78.5,Сдано,15,2026-06-14 10:15"
    ].join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${selectedExamForReport.title.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPngDashboard = () => {
    if (!selectedExamForReport) return;

    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 600, 500);

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    };

    roundRect(20, 20, 560, 460, 16);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = "transparent";

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Визуальный отчет по экзамену", 45, 65);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`Название: ${selectedExamForReport.title}`, 45, 90);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(45, 115, 510, 1.5);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("СРЕДНИЙ БАЛЛ", 45, 150);
    ctx.fillStyle = "#0040b0";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("77.5%", 45, 190);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("СДАЛИ ЭКЗАМЕН", 300, 150);
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("75.0%", 300, 190);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(45, 220, 510, 1.5);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("РАСПРЕДЕЛЕНИЕ ОЦЕНОК", 45, 255);

    const items = [
      { label: "90% - 100%", widthPct: 0.25, color: "#0040b0", count: "1 студ." },
      { label: "75% - 89%", widthPct: 0.50, color: "#10b981", count: "2 студ." },
      { label: "60% - 74%", widthPct: 0.00, color: "#fbbf24", count: "0 студ." },
      { label: "  < 60%", widthPct: 0.25, color: "#ef4444", count: "1 студ." },
    ];

    let startY = 285;
    items.forEach((item) => {

      ctx.fillStyle = "#334155";
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(item.label, 45, startY + 12);

      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(145, startY, 320, 16);

      if (item.widthPct > 0) {
        ctx.fillStyle = item.color;
        ctx.fillRect(145, startY, 320 * item.widthPct, 16);
      }

      ctx.fillStyle = "#475569";
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(item.count, 485, startY + 12);

      startY += 40;
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `report_${selectedExamForReport.title.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={12}>
        <CircularProgress size={44} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1250, mx: "auto", px: 2 }}>
      {}
      <input
        type="file"
        id="json-import-input"
        style={{ display: "none" }}
        accept=".json"
        onChange={handleImportJson}
      />

      {}
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          {(user.role === "teacher" || user.role === "admin") && (
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, letterSpacing: 1.5 }}>
              ПАНЕЛЬ ПРЕПОДАВАТЕЛЯ
            </Typography>
          )}
          <Typography variant="h3" fontWeight={850} sx={{ mt: 0.5, color: "#0f172a" }}>
            Экзамены
          </Typography>
        </Box>
        {(user.role === "teacher" || user.role === "admin") && (
          <Box display="flex" gap={1.5}>
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => document.getElementById("json-import-input")?.click()}
              sx={{ border: "1.5px solid #cbd5e1", textTransform: "none", fontWeight: 700, borderRadius: "8px", color: "#475569" }}
            >
              Импорт JSON
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setIsCreatorOpen(true);
                setCreatorStep(1);
                setEditingExamId(null);
                setNewExamTitle("");
                setNewExamDuration(60);
                setNewExamPassing(60);
                setNewExamAttempts(1);
                setNewExamStartTime("");
                setNewExamEndTime("");
                setUploadedSlideId(null);
                setCreatorRegions([]);
                setExamSlides([]);
                setSelectedExistingSlideIds([]);
                setOrderedRegionIds([]);
                setFlaggedRegionIds([]);
                setEditingExamQuestions([]);
              }}
              sx={{ bgcolor: "#0040b0", textTransform: "none", fontWeight: 700, borderRadius: "8px", "&:hover": { bgcolor: "#003390" } }}
            >
              Новый экзамен
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 4, borderRadius: "10px" }}>{error}</Alert>}

      <Grid container spacing={4}>
        {}
        <Grid item xs={12} lg={user.role === "teacher" || user.role === "admin" ? 7 : 12}>
          <Stack spacing={3}>
            {exams.map((exam, index) => {
              const examAttempts = attempts.filter(a => a.exam_id === exam.id);
              const attemptCount = examAttempts.length;
              const hasPassed = examAttempts.some(a => a.passed);
              const latestAttempt = examAttempts[0];
              const imgUrl = cardImages[index % cardImages.length];
              const flaggedQuestionsCount = (exam.questions || []).filter((q: any) => q.is_flagged).length;

              return (
                <Card
                  key={exam.id}
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
                    borderRadius: "14px",
                    transition: "transform 0.2s, border-color 0.2s",
                    "&:hover": { borderColor: "#94a3b8", transform: "translateY(-2px)" }
                  }}
                >
                  {}
                  <Box
                    sx={{
                      width: { xs: "100%", sm: 200 },
                      height: { xs: 160, sm: "auto" },
                      minWidth: 200,
                      backgroundImage: `url('${imgUrl}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  {}
                  <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                    <CardContent sx={{ p: 3, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a", fontSize: "1.15rem" }}>
                          {exam.title}
                        </Typography>

                        {user.role === "student" && (
                          hasPassed ? (
                            <Chip
                              icon={<CheckCircleOutlineIcon />}
                              label="Сдано"
                              color="success"
                              size="small"
                              sx={{ fontWeight: 700, borderRadius: "6px" }}
                            />
                          ) : attemptCount >= exam.attempt_limit ? (
                            <Chip
                              icon={<WarningAmberIcon />}
                              label="Превышен лимит"
                              color="error"
                              size="small"
                              sx={{ fontWeight: 700, borderRadius: "6px" }}
                            />
                          ) : (
                            <Chip
                              label={`Попыток осталось: ${exam.attempt_limit - attemptCount}`}
                              color="warning"
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 700, borderRadius: "6px" }}
                            />
                          )
                        )}
                        {user.role !== "student" && flaggedQuestionsCount > 0 && (
                          <Chip
                            icon={<FlagIcon style={{ color: "#ffffff", fontSize: 13 }} />}
                            label={`Ошибки: ${flaggedQuestionsCount}`}
                            color="error"
                            size="small"
                            sx={{ fontWeight: 800, borderRadius: "6px" }}
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 36, lineHeight: 1.5 }}>
                        {exam.description || "Описание отсутствует."}
                      </Typography>

                      {}
                      <Box display="flex" gap={1} sx={{ mb: 2.5, flexWrap: "wrap" }}>
                        <Chip
                          icon={<QuestionMarkIcon style={{ fontSize: 13, color: "#0040b0" }} />}
                          label={`${exam.question_count || index * 4 + 4} вопр.`}
                          size="small"
                          sx={{ bgcolor: "rgba(0,64,176,0.06)", color: "#0040b0", fontWeight: 700, borderRadius: "6px" }}
                        />
                        <Chip
                          icon={<GroupIcon style={{ fontSize: 13, color: "#0040b0" }} />}
                          label={`${exam.duration_minutes} мин.`}
                          size="small"
                          sx={{ bgcolor: "rgba(0,64,176,0.06)", color: "#0040b0", fontWeight: 700, borderRadius: "6px" }}
                        />
                        <Chip
                          label={`Проходной: ${exam.passing_score}%`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, borderColor: "#cbd5e1", borderRadius: "6px", color: "#475569" }}
                        />
                        {user.role === "student" && latestAttempt && (
                          <Chip
                            label={`Результат: ${latestAttempt.score_pct.toFixed(1)}%`}
                            color={latestAttempt.passed ? "success" : "error"}
                            size="small"
                            sx={{ fontWeight: 800, borderRadius: "6px" }}
                          />
                        )}
                      </Box>

                      <Divider sx={{ my: 1.5, borderColor: "#f1f5f9" }} />

                      {}
                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mt: "auto" }}>
                        {user.role === "student" ? (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            disabled={attemptCount >= exam.attempt_limit && !hasPassed}
                            onClick={() => navigate(`/exams/${exam.id}/take`)}
                            sx={{ bgcolor: "#0040b0", py: 0.9, px: 2.5, borderRadius: "8px", textTransform: "none", fontWeight: 700 }}
                          >
                            {attemptCount > 0 ? "Пересдать" : "Начать экзамен"}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<EditIcon style={{ fontSize: 14 }} />}
                              onClick={() => handleEditExam(exam)}
                              sx={{ bgcolor: "#0040b0", borderRadius: "8px", py: 0.9, px: 2.5, textTransform: "none", fontWeight: 700, "&:hover": { bgcolor: "#003390" } }}
                            >
                              Редактировать
                            </Button>

                            <Box display="flex" gap={0.8}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/exams/${exam.id}/take`)}
                                sx={{ border: "1.5px solid #e2e8f0", borderRadius: "8px", p: 0.8 }}
                              >
                                <PlayArrowIcon style={{ fontSize: 18, color: "#0040b0" }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenScheduling(exam)}
                                sx={{ border: "1.5px solid #e2e8f0", borderRadius: "8px", p: 0.8 }}
                              >
                                <CalendarTodayIcon style={{ fontSize: 16, color: "#475569" }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenReport(exam)}
                                sx={{ border: "1.5px solid #e2e8f0", borderRadius: "8px", p: 0.8 }}
                              >
                                <GetAppIcon style={{ fontSize: 16, color: "#475569" }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteExam(exam.id, exam.title)}
                                sx={{ border: "1.5px solid #fee2e2", borderRadius: "8px", p: 0.8, bgcolor: "#fff1f1", "&:hover": { bgcolor: "#fecaca" } }}
                              >
                                <DeleteOutlineIcon style={{ fontSize: 18, color: "#ef4444" }} />
                              </IconButton>
                            </Box>
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Box>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {}
        {(user.role === "teacher" || user.role === "admin") && (
          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>

              {}
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", borderRadius: "14px" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <TrendingUpIcon sx={{ color: "#0040b0" }} />
                    <Typography variant="h6" fontWeight={800} color="#0f172a">
                      Аналитическая панель
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Сводные показатели успеваемости студентов по текущим контрольным.
                  </Typography>

                  {}
                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, border: "1px solid #e2e8f0", bgcolor: "#f8fafc", borderRadius: "10px", textAlign: "center", boxShadow: "none" }}>
                        <SchoolIcon sx={{ fontSize: 24, color: "#0040b0", mb: 0.5 }} />
                        <Typography variant="h5" fontWeight={850} color="#0f172a">77.5%</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Средний балл</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, border: "1px solid #e2e8f0", bgcolor: "#f8fafc", borderRadius: "10px", textAlign: "center", boxShadow: "none" }}>
                        <AssignmentTurnedInIcon sx={{ fontSize: 24, color: "#10b981", mb: 0.5 }} />
                        <Typography variant="h5" fontWeight={850} color="#10b981">75.0%</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Успешность (Pass)</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {}
                  <Typography variant="subtitle2" fontWeight={800} color="#334155" sx={{ mb: 1.5, fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Успешность по темам (%)
                  </Typography>
                  <Stack spacing={2} sx={{ mb: 3 }}>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" fontWeight={700} color="#475569">Строение клетки</Typography>
                        <Typography variant="caption" fontWeight={800} color="#0040b0">85%</Typography>
                      </Box>
                      <Box sx={{ width: "100%", height: 8, bgcolor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                        <Box sx={{ width: "85%", height: "100%", bgcolor: "#0040b0", borderRadius: "4px" }} />
                      </Box>
                    </Box>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" fontWeight={700} color="#475569">Эпителиальные ткани</Typography>
                        <Typography variant="caption" fontWeight={800} color="#10b981">68%</Typography>
                      </Box>
                      <Box sx={{ width: "100%", height: 8, bgcolor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                        <Box sx={{ width: "68%", height: "100%", bgcolor: "#10b981", borderRadius: "4px" }} />
                      </Box>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 2.5 }} />

                  {}
                  <Typography variant="subtitle2" fontWeight={800} color="#334155" sx={{ mb: 2, fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Активность прохождения
                  </Typography>
                  <Stack spacing={2}>
                    <Box display="flex" gap={1.5} alignItems="center">
                      <Box sx={{ width: 8, height: 8, bgcolor: "#10b981", borderRadius: "50%" }} />
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#0f172a">Алексей Иванов</Typography>
                        <Typography variant="caption" color="text.secondary">Сдал "Строение клетки" на <b>92.5%</b></Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1.5} alignItems="center">
                      <Box sx={{ width: 8, height: 8, bgcolor: "#10b981", borderRadius: "50%" }} />
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#0f172a">Екатерина Кузнецова</Typography>
                        <Typography variant="caption" color="text.secondary">Сдала "Эпителиальные ткани" на <b>84.0%</b></Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1.5} alignItems="center">
                      <Box sx={{ width: 8, height: 8, bgcolor: "#ef4444", borderRadius: "50%" }} />
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#0f172a">Дмитрий Смирнов</Typography>
                        <Typography variant="caption" color="text.secondary">Провал в "Эпителиальные ткани": <b>55.0%</b></Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {}
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", borderRadius: "14px" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: "#0f172a" }}>
                    Назначить пересдачу
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Предоставьте студентам дополнительные попытки для прохождения экзаменов.
                  </Typography>

                  {grantSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: "8px" }} onClose={() => setGrantSuccess(null)}>{grantSuccess}</Alert>}
                  {grantError && <Alert severity="error" sx={{ mb: 2, borderRadius: "8px" }} onClose={() => setGrantError(null)}>{grantError}</Alert>}

                  <Box component="form" onSubmit={handleGrantRetake} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="student-select-label">Выберите студента</InputLabel>
                      <Select
                        labelId="student-select-label"
                        label="Выберите студента"
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        sx={{ borderRadius: "8px" }}
                      >
                        {students.map(s => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel id="exam-select-label">Выберите экзамен</InputLabel>
                      <Select
                        labelId="exam-select-label"
                        label="Выберите экзамен"
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        sx={{ borderRadius: "8px" }}
                      >
                        {exams.map(e => (
                          <MenuItem key={e.id} value={e.id}>
                            {e.title}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Количество попыток"
                      type="number"
                      variant="outlined"
                      size="small"
                      value={retakeAttempts}
                      onChange={(e) => setRetakeAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                      fullWidth
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      sx={{ py: 1.2, fontWeight: 700, borderRadius: "8px", bgcolor: "#0040b0", textTransform: "none", "&:hover": { bgcolor: "#003390" } }}
                    >
                      Назначить пересдачу
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        )}
      </Grid>

      {}
      <Dialog
        open={schedulingOpen}
        onClose={() => setSchedulingOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 850, pb: 1, color: "#0f172a" }}>
          Параметры планирования
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Выберите период времени на календаре или укажите точные даты ниже.
          </Typography>

          {}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} px={1}>
            <Typography variant="subtitle2" fontWeight={800} color="#1e293b">
              {currentCalendarMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
            </Typography>
            <Box display="flex" gap={0.5}>
              <IconButton
                size="small"
                onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))}
                sx={{ border: "1px solid #cbd5e1" }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))}
                sx={{ border: "1px solid #cbd5e1" }}
              >
                <ArrowForwardIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {}
          <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", p: 1, bgcolor: "#f8fafc", mb: 3 }}>
            {}
            <Grid container columns={7} sx={{ textAlign: "center", mb: 1 }}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(w => (
                <Grid item xs={1} key={w}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b" }}>{w}</Typography>
                </Grid>
              ))}
            </Grid>

            {}
            <Grid container columns={7} spacing={0.5} sx={{ textAlign: "center" }}>
              {getCalendarDays().map((dayNum, idx) => {
                if (dayNum === null) {
                  return <Grid item xs={1} key={`empty-${idx}`} />;
                }
                const selected = isDaySelected(dayNum);
                return (
                  <Grid item xs={1} key={`day-${dayNum}`}>
                    <Box
                      onClick={() => handleDayClick(dayNum)}
                      sx={{
                        py: 0.8,
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        bgcolor: selected ? "#0040b0" : "transparent",
                        color: selected ? "#ffffff" : "#334155",
                        transition: "background-color 0.1s, color 0.1s",
                        "&:hover": {
                          bgcolor: selected ? "#003390" : "#e2e8f0"
                        }
                      }}
                    >
                      {dayNum}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {}
          <Stack spacing={2}>
            <TextField
              label="Доступен с (От)"
              type="datetime-local"
              size="small"
              value={schedulingStart}
              onChange={(e) => setSchedulingStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
            <TextField
              label="Доступен до (До)"
              type="datetime-local"
              size="small"
              value={schedulingEnd}
              onChange={(e) => setSchedulingEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setSchedulingOpen(false)} color="inherit" sx={{ textTransform: "none", fontWeight: 700 }}>
            Отмена
          </Button>
          <Button onClick={handleSaveScheduling} variant="contained" sx={{ bgcolor: "#0040b0", textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>
            Сохранить параметры
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        maxWidth={showVisualDashboard ? "sm" : "xs"}
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 850, pb: 1, color: "#0f172a" }}>
          Скачать отчет по экзамену
        </DialogTitle>
        <DialogContent>
          {!showVisualDashboard ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Выберите формат для экспорта результатов студентов и аналитики экзамена.
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<GetAppIcon />}
                  onClick={downloadExcelReport}
                  sx={{
                    justifyContent: "flex-start",
                    py: 1.5,
                    px: 2.5,
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#0f172a"
                  }}
                >
                  Экспортировать в Excel (.xlsx / .csv)
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<GetAppIcon />}
                  onClick={downloadTxtReport}
                  sx={{
                    justifyContent: "flex-start",
                    py: 1.5,
                    px: 2.5,
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#0f172a"
                  }}
                >
                  Скачать текстовый отчет (.txt)
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<TrendingUpIcon />}
                  onClick={() => setShowVisualDashboard(true)}
                  sx={{
                    justifyContent: "flex-start",
                    py: 1.5,
                    px: 2.5,
                    bgcolor: "#0040b0",
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#ffffff",
                    "&:hover": { bgcolor: "#003390" }
                  }}
                >
                  Визуальный отчет (Графики / Power BI)
                </Button>
              </Stack>
            </>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#475569" }}>
                Визуальный отчет: {selectedExamForReport?.title}
              </Typography>

              {}
              <Paper sx={{ p: 3, border: "1.5px solid #0040b0", bgcolor: "#f8fafc", borderRadius: "12px", boxShadow: "none" }}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, display: "block" }}>СРЕДНИЙ БАЛЛ</Typography>
                    <Typography variant="h4" fontWeight={900} color="#0040b0">77.5%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, display: "block" }}>СДАЛИ ЭКЗАМЕН</Typography>
                    <Typography variant="h4" fontWeight={900} color="#10b981">75.0%</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1.5 }} />

                {}
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, display: "block", mb: 1.5 }}>РАСПРЕДЕЛЕНИЕ ОЦЕНОК</Typography>

                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" sx={{ width: 60, fontWeight: 700, color: "#334155" }}>90% - 100%</Typography>
                    <Box sx={{ flexGrow: 1, height: 12, bgcolor: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                      <Box sx={{ width: "25%", height: "100%", bgcolor: "#0040b0", borderRadius: "6px" }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 25, fontWeight: 700, textAlign: "right" }}>1</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" sx={{ width: 60, fontWeight: 700, color: "#334155" }}>75% - 89%</Typography>
                    <Box sx={{ flexGrow: 1, height: 12, bgcolor: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                      <Box sx={{ width: "50%", height: "100%", bgcolor: "#10b981", borderRadius: "6px" }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 25, fontWeight: 700, textAlign: "right" }}>2</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" sx={{ width: 60, fontWeight: 700, color: "#334155" }}>60% - 74%</Typography>
                    <Box sx={{ flexGrow: 1, height: 12, bgcolor: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                      <Box sx={{ width: "0%", height: "100%", bgcolor: "#fbbf24", borderRadius: "6px" }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 25, fontWeight: 700, textAlign: "right" }}>0</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" sx={{ width: 60, fontWeight: 700, color: "#334155" }}>&lt; 60%</Typography>
                    <Box sx={{ flexGrow: 1, height: 12, bgcolor: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                      <Box sx={{ width: "25%", height: "100%", bgcolor: "#ef4444", borderRadius: "6px" }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 25, fontWeight: 700, textAlign: "right" }}>1</Typography>
                  </Box>
                </Stack>
              </Paper>

              <Box display="flex" gap={1.5} sx={{ mt: 1 }}>
                <Button
                  onClick={() => setShowVisualDashboard(false)}
                  variant="outlined"
                  fullWidth
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                >
                  Назад
                </Button>
                <Button
                  onClick={downloadPngDashboard}
                  variant="contained"
                  fullWidth
                  sx={{ bgcolor: "#0040b0", textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                >
                  Скачать PNG граффик
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setReportOpen(false)} color="inherit" sx={{ textTransform: "none", fontWeight: 700 }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        fullScreen
        open={isCreatorOpen}
        onClose={() => {
          if (window.confirm("Вы уверены, что хотите закрыть редактор? Все несохраненные изменения будут потеряны.")) {
            setIsCreatorOpen(false);
            setUploadedSlideId(null);
            setCreatorStep(1);
            setNewExamTitle("");
            setEditingExamId(null);
            setSelectedGroupIds([]);
            setSelectedStudentIds([]);
            setExamSlides([]);
            setSelectedExistingSlideIds([]);
            setOrderedRegionIds([]);
          }
        }}
      >
        {}
        {creatorStep === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#f8fafc" }}>
            <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h5" sx={{ fontWeight: 850 }}>Создание интерактивного экзамена</Typography>
              <IconButton onClick={() => {
                if (window.confirm("Вы уверены, что хотите закрыть редактор? Все несохраненные изменения будут потеряны.")) {
                  setIsCreatorOpen(false);
                  setUploadedSlideId(null);
                  setCreatorStep(1);
                  setNewExamTitle("");
                  setEditingExamId(null);
                  setSelectedGroupIds([]);
                  setSelectedStudentIds([]);
                  setExamSlides([]);
                  setSelectedExistingSlideIds([]);
                  setOrderedRegionIds([]);
                }
              }}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, p: 4, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Paper sx={{ p: 4, maxWidth: 650, width: "100%", border: "1px solid #e2e8f0", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: "#0f172a" }}>Шаг 1: Подготовка файлов препаратов к экзамену</Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

                  <Typography variant="body2" sx={{ fontWeight: 750, color: "#475569" }}>
                    Загрузить новые препараты (SVS, TIF, PNG, JPG, JPEG)
                  </Typography>

                  {}
                  <Box
                    onClick={() => document.getElementById("slide-file-input")?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    sx={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: "12px",
                      p: 4.5,
                      textAlign: "center",
                      cursor: "pointer",
                      bgcolor: "#f8fafc",
                      transition: "border-color 0.2s, background-color 0.2s",
                      "&:hover": { borderColor: "#0040b0", bgcolor: "#f0f4fc" }
                    }}
                  >
                    <input
                      type="file"
                      id="slide-file-input"
                      style={{ display: "none" }}
                      multiple
                      accept="*"
                      onChange={handleFileSelect}
                    />
                    <FileUploadIcon sx={{ fontSize: 44, color: "#94a3b8", mb: 1.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>
                      Нажмите для выбора или перетащите файлы сюда
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      Поддерживаются файлы до 2 ГБ (можно выбрать несколько)
                    </Typography>
                  </Box>

                  {uploading && (
                    <Box sx={{ mt: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: "#0040b0", fontWeight: 700 }}>Загрузка и обработка препаратов...</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{uploadProgress}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: "3px" }} />
                    </Box>
                  )}

                  {!uploading && existingSlides.length > 0 && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                      <Divider>
                        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>ИЛИ</Typography>
                      </Divider>

                      <Typography variant="body2" sx={{ fontWeight: 750, color: "#475569" }}>
                        Выберите из существующих препаратов курса (Multiselect):
                      </Typography>

                      <FormControl size="small" fullWidth>
                        <InputLabel id="existing-slide-label" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>Выберите препараты курса</InputLabel>
                        <Select
                          labelId="existing-slide-label"
                          label="Выберите препараты курса"
                          multiple
                          value={selectedExistingSlideIds}
                          onChange={(e) => {
                            const val = e.target.value;
                            const ids = typeof val === 'string' ? val.split(',') : val;
                            setSelectedExistingSlideIds(ids);

                            const slides = existingSlides.filter(s => ids.includes(s.id));
                            setExamSlides(prev => {
                              const uploaded = prev.filter(p => !existingSlides.some(es => es.id === p.id));
                              return [...uploaded, ...slides];
                            });
                          }}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => {
                                const slide = existingSlides.find(s => s.id === value);
                                return <Chip key={value} label={slide?.title || value} size="small" sx={{ height: 20, fontSize: "0.72rem" }} />;
                              })}
                            </Box>
                          )}
                          sx={{
                            borderRadius: "8px",
                            fontSize: "0.8rem",
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" }
                          }}
                        >
                          {existingSlides.map(s => (
                            <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.8rem" }}>{s.title}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {examSlides.length > 0 && (
                    <Box sx={{ mt: 1, borderTop: "1px solid #e2e8f0", pt: 2.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
                        Выбранные препараты для этого экзамена ({examSlides.length}):
                      </Typography>
                      <Stack spacing={1} sx={{ maxHeight: 180, overflowY: "auto", pr: 0.5 }}>
                        {examSlides.map((slide, idx) => (
                          <Paper
                            key={slide.id}
                            variant="outlined"
                            sx={{
                              p: 1.2,
                              px: 2,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderRadius: "8px",
                              bgcolor: "#f8fafc",
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.78rem", color: "#334155" }}>
                              {idx + 1}. {slide.title}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setExamSlides(examSlides.filter(s => s.id !== slide.id));
                                setSelectedExistingSlideIds(selectedExistingSlideIds.filter(id => id !== slide.id));
                              }}
                              sx={{ color: "error.main", p: 0.4 }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Paper>
                        ))}
                      </Stack>

                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => {
                          const firstSlide = examSlides[0];
                          setSlideTitle(firstSlide.title);
                          setUploadedSlideId(firstSlide.id);
                          setCreatorStep(2);
                        }}
                        sx={{ mt: 2.5, py: 1.2, bgcolor: "#0040b0", fontWeight: 700, textTransform: "none", borderRadius: "8px", "&:hover": { bgcolor: "#003390" } }}
                      >
                        Перейти к разметке и созданию вопросов
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {}
        {creatorStep === 2 && uploadedSlideId && (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "#ffffff", overflow: "hidden" }}>
            {}
            <Box
              sx={{
                p: 2,
                px: 3,
                borderBottom: "1px solid #e2e8f0",
                bgcolor: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 100
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ bgcolor: "rgba(0,64,176,0.08)", p: 0.8, borderRadius: "6px", color: "#0040b0", display: "flex" }}>
                  <EditIcon />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                    Редактор вопросов: {newExamTitle}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                    Препарат: {slideTitle}
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" gap={2}>
                <Button variant="outlined" color="inherit" onClick={() => setIsCreatorOpen(false)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (creatorRegions.length === 0) {
                      alert("Пожалуйста, добавьте хотя бы один интерактивный вопрос на изображении.");
                      return;
                    }
                    setSettingsDialogOpen(true);
                  }}
                  sx={{ bgcolor: "#0040b0", fontWeight: 700, textTransform: "none", borderRadius: "8px", "&:hover": { bgcolor: "#003390" } }}
                >
                  Далее
                </Button>
              </Box>
            </Box>

            {}
            <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden", position: "relative" }}>
              {}
              <Paper
                elevation={0}
                sx={{
                  width: 320,
                  borderRight: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  borderRadius: 0,
                  bgcolor: "#f8fafc"
                }}
              >
                <Box sx={{ p: 2.5, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                    Инструменты разметки (как в Paint)
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5 }}>
                    Выберите фигуру на панели в верхнем правом углу картинки и выделите область на препарате.
                  </Typography>
                </Box>

                <Box sx={{ p: 2.5, flexGrow: 1, overflowY: "auto" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>
                    Вопросы на изображении ({creatorRegions.length})
                  </Typography>

                  {creatorRegions.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "8px", bgcolor: "#ffffff", p: 2 }}>
                      <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 700 }}>
                        Вопросы еще не добавлены
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 0.5 }}>
                        Нарисуйте фигуру на препарате, чтобы создать первый интерактивный вопрос
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.5}>
                      {creatorRegions.map((reg, idx) => {
                        const slide = examSlides.find(s => s.id === reg.slideId);
                        const slideTitleText = slide ? slide.title : "Препарат";
                        const isCurrentActive = reg.slideId === uploadedSlideId;

                        return (
                          <Card
                            key={reg.id}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, idx)}
                            onClick={() => {
                              if (reg.slideId && reg.slideId !== uploadedSlideId) {
                                setUploadedSlideId(reg.slideId);
                                if (slide) setSlideTitle(slide.title);
                              }
                            }}
                            sx={{
                              border: isCurrentActive ? "2px solid #0040b0" : "1px solid #e2e8f0",
                              boxShadow: "none",
                              borderRadius: "8px",
                              cursor: "grab",
                              transition: "background-color 0.2s, border-color 0.2s",
                              bgcolor: isCurrentActive ? "rgba(0,64,176,0.02)" : "#ffffff",
                              "&:active": { cursor: "grabbing" },
                              "&:hover": { bgcolor: "#f8fafc", borderColor: isCurrentActive ? "#003390" : "#cbd5e1" }
                            }}
                          >
                            <CardContent sx={{ p: 1.8, "&:last-child": { pb: 1.8 } }}>
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <DragIndicatorIcon sx={{ color: "#94a3b8", fontSize: 18, mr: 0.5, cursor: "grab" }} />
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "#0040b0", fontWeight: 700, display: "block", fontSize: "0.7rem", mb: 0.2 }}>
                                      {slideTitleText}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                      {flaggedRegionIds.includes(reg.id) && (
                                        <IconButton
                                          size="small"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Вы действительно хотите снять отметку об ошибке с вопроса "${reg.title}"?`)) {
                                              const q = (editingExamQuestions || []).find((qItem: any) => qItem.region_of_interest?.region_id === reg.id);
                                              if (q) {
                                                try {
                                                  await axios.post(`/api/v1/exams/questions/${q.id}/flag`);
                                                  setFlaggedRegionIds(prev => prev.filter(id => id !== reg.id));
                                                } catch (err) {
                                                  console.error("Failed to unflag question:", err);
                                                }
                                              } else {
                                                setFlaggedRegionIds(prev => prev.filter(id => id !== reg.id));
                                              }
                                            }
                                          }}
                                          title="Вопрос отмечен студентом как ошибочный. Нажмите, чтобы снять отметку."
                                          sx={{ p: 0.2, color: "#ef4444" }}
                                        >
                                          <FlagIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      )}
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                        {idx + 1}. {reg.title}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRegion(reg.id);
                                  }}
                                  sx={{ color: "#ef4444", p: 0.5 }}
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                              {reg.content_data?.question_text && (
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5, pl: 3, lineHeight: 1.2 }}>
                                  Вопрос: {reg.content_data.question_text}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Paper>

              {}
              <Box sx={{ flexGrow: 1, height: "100%", position: "relative" }}>
                <SlideViewer slideId={uploadedSlideId} isTeacher={true} />
              </Box>

              {}
              <Paper
                elevation={0}
                sx={{
                  width: 280,
                  borderLeft: "1px solid #e2e8f0",
                  flexDirection: "column",
                  borderRadius: 0,
                  bgcolor: "#f8fafc",
                  display: { xs: "none", md: "flex" }
                }}
              >
                <Box sx={{ p: 2.5, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                    Препараты экзамена ({examSlides.length})
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5 }}>
                    Выберите файл для создания и привязки вопросов.
                  </Typography>
                </Box>

                <Box sx={{ p: 2, flexGrow: 1, overflowY: "auto" }}>
                  <Stack spacing={2}>
                    {examSlides.map((slide, idx) => {
                      const isActive = slide.id === uploadedSlideId;
                      const imgUrl = cardImages[idx % cardImages.length];

                      return (
                        <Card
                          key={slide.id}
                          sx={{
                            border: isActive ? "2px solid #0040b0" : "1px solid #e2e8f0",
                            boxShadow: "none",
                            borderRadius: "10px",
                            bgcolor: isActive ? "rgba(0,64,176,0.02)" : "#ffffff"
                          }}
                        >
                          <Box sx={{ height: 75, backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
                          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.8rem", mb: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {slide.title}
                            </Typography>

                            <Box display="flex" justifyContent="space-between" gap={1}>
                              <Button
                                variant={isActive ? "contained" : "outlined"}
                                size="small"
                                disabled={isActive}
                                onClick={() => {
                                  setUploadedSlideId(slide.id);
                                  setSlideTitle(slide.title);
                                }}
                                sx={{
                                  flexGrow: 1,
                                  fontSize: "0.7rem",
                                  py: 0.5,
                                  textTransform: "none",
                                  fontWeight: 700,
                                  borderRadius: "6px"
                                }}
                              >
                                {isActive ? "Активен" : "Перейти"}
                              </Button>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (window.confirm(`Вы уверены, что хотите убрать препарат "${slide.title}" из экзамена? Все созданные вопросы на этом препарате не будут включены.`)) {
                                    const remaining = examSlides.filter(s => s.id !== slide.id);
                                    setExamSlides(remaining);
                                    if (remaining.length === 0) {
                                      setUploadedSlideId(null);
                                      setCreatorStep(1);
                                    } else if (isActive) {
                                      const nextSlide = remaining[0];
                                      setUploadedSlideId(nextSlide.id);
                                      setSlideTitle(nextSlide.title);
                                    }
                                  }
                                }}
                                sx={{ color: "#ef4444", border: "1px solid #fee2e2", borderRadius: "6px", p: 0.5 }}
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}
      </Dialog>

      {}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 850, pb: 1 }}>Параметры и ограничения экзамена</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <TextField
            label="Название экзамена"
            placeholder="напр. Контрольная по строению ядра"
            fullWidth
            size="small"
            value={newExamTitle}
            onChange={(e) => setNewExamTitle(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
          />

          <Box display="flex" gap={2}>
            <TextField
              label="Длительность (минут)"
              type="number"
              size="small"
              fullWidth
              value={newExamDuration}
              onChange={(e) => setNewExamDuration(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
            <TextField
              label="Проходной балл (%)"
              type="number"
              size="small"
              fullWidth
              value={newExamPassing}
              onChange={(e) => setNewExamPassing(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
            <TextField
              label="Лимит попыток"
              type="number"
              size="small"
              fullWidth
              value={newExamAttempts}
              onChange={(e) => setNewExamAttempts(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
          </Box>

          <DateRangePicker
            startTime={newExamStartTime}
            endTime={newExamEndTime}
            onChange={(start, end) => {
              setNewExamStartTime(start);
              setNewExamEndTime(end);
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="assign-groups-label">Назначить группам (опционально)</InputLabel>
            <Select
              labelId="assign-groups-label"
              multiple
              value={selectedGroupIds}
              onChange={(e) => setSelectedGroupIds(e.target.value as string[])}
              label="Назначить группам (опционально)"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const g = groups.find(group => group.id === value);
                    return <Chip key={value} label={g ? g.name : value} size="small" />;
                  })}
                </Box>
              )}
              sx={{ borderRadius: "8px" }}
            >
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="assign-students-label">Назначить студентам (опционально)</InputLabel>
            <Select
              labelId="assign-students-label"
              multiple
              value={selectedStudentIds}
              onChange={(e) => setSelectedStudentIds(e.target.value as string[])}
              label="Назначить студентам (опционально)"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const s = students.find(student => student.id === value);
                    return <Chip key={value} label={s ? s.name : value} size="small" />;
                  })}
                </Box>
              )}
              sx={{ borderRadius: "8px" }}
            >
              {students.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setSettingsDialogOpen(false)} color="inherit" sx={{ textTransform: "none", fontWeight: 700 }}>
            Назад к разметке
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAndPublishExam}
            disabled={!newExamTitle.trim()}
            sx={{ bgcolor: "#0040b0", fontWeight: 700, textTransform: "none", borderRadius: "8px", "&:hover": { bgcolor: "#003390" } }}
          >
            {editingExamId ? "Сохранить изменения" : "Опубликовать экзамен"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamListPage;

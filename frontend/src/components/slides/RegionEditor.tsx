import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Radio, RadioGroup,
  FormControlLabel, IconButton, List, ListItem, ListItemSecondaryAction,
  CircularProgress, Tooltip
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  PictureAsPdf as PictureAsPdfIcon
} from "@mui/icons-material";
import axios from "axios";

export type RegionShapeType = "rectangle" | "circle" | "polygon" | "freehand" | "line" | "arrow" | "text";
export type RegionContentType = "question" | "explanation" | "youtube" | "audio" | "pdf" | "link" | "question_point";

interface RegionEditorProps {
  open: boolean;
  slideId: string;
  shapeType: RegionShapeType;
  geometry: any;
  contentType: RegionContentType;
  onClose: () => void;
  onSave: (region: any) => void;
}

export const RegionEditor: React.FC<RegionEditorProps> = ({
  open,
  slideId,
  shapeType,
  geometry,
  contentType: propContentType,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<RegionContentType>("explanation");

  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [correctOption, setCorrectOption] = useState<number>(0);

  const [explanation, setExplanation] = useState("");

  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.endsWith(".ogg") ||
      lower.includes("youtube.com") ||
      lower.includes("youtu.be")
    );
  };

  const isAudioUrl = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg") || lower.endsWith(".aac");
  };

  const isPdfUrl = (url: string) => {
    if (!url) return false;
    return url.toLowerCase().endsWith(".pdf");
  };

  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/api/v1/regions/upload-media", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMediaUrl(res.data.url);
    } catch (err) {
      console.error("Failed to upload media file:", err);
      alert("Не удалось загрузить файл.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setContentType(propContentType);
      setQuestionText("");
      setOptions(["Option 1", "Option 2"]);
      setCorrectOption(0);
      setExplanation("");
      setMediaUrl("");
    }
  }, [open, propContentType]);

  const handleAddOption = () => {
    setOptions([...options, `Option ${options.length + 1}`]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, idx) => idx !== index);
    const newOptionsLength = newOptions.length;
    setOptions(newOptions);
    if (correctOption >= newOptionsLength) {
      setCorrectOption(newOptionsLength - 1);
    }
  };

  const handleOptionTextChange = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    let contentData: any = {};
    if (contentType === "question") {
      contentData = {
        question_text: questionText,
        options: options.map((opt, idx) => ({ id: idx, text: opt, is_correct: idx === correctOption })),
        correct_option_index: correctOption,
        explanation: explanation,
        explanation_image: isVideoUrl(mediaUrl) ? "" : mediaUrl,
        explanation_video: isVideoUrl(mediaUrl) ? mediaUrl : ""
      };
    } else if (contentType === "question_point") {
      contentData = {
        question_text: questionText,
        explanation: explanation,
        explanation_image: isVideoUrl(mediaUrl) ? "" : mediaUrl,
        explanation_video: isVideoUrl(mediaUrl) ? mediaUrl : ""
      };
    } else if (contentType === "explanation") {
      contentData = {
        explanation_text: explanation || description || title,
        explanation_image: isVideoUrl(mediaUrl) ? "" : mediaUrl,
        explanation_video: isVideoUrl(mediaUrl) ? mediaUrl : ""
      };
    } else {
      contentData = {
        media_url: mediaUrl
      };
    }

    const payload = {
      slide_id: slideId,
      title,
      description,
      region_type: shapeType,
      geometry,
      content_type: contentType,
      content_data: contentData
    };

    axios.post("/api/v1/regions/", payload)
      .then(res => {
        onSave(res.data);
        onClose();
      })
      .catch(err => {
        console.error("Failed to save region:", err);
      });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: "1px solid #e2e8f0", pb: 2, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" fontWeight={800} color="#0f172a">
          {contentType === "question" && "Создание тестового вопроса"}
          {contentType === "question_point" && "Создание вопроса (указать область)"}
          {contentType === "explanation" && "Создание аннотации (пояснения)"}
          {contentType === "youtube" && "Добавление YouTube видео"}
          {contentType === "audio" && "Добавление аудиогида"}
          {contentType === "pdf" && "Добавление PDF документа"}
          {contentType === "link" && "Добавление внешней ссылки"}
        </Typography>
        <Typography variant="caption" sx={{ bgcolor: "primary.light", color: "primary.contrastText", px: 1.2, py: 0.5, borderRadius: "12px", fontWeight: 700 }}>
          {shapeType === "circle" && "Круг"}
          {shapeType === "rectangle" && "Прямоугольник"}
          {shapeType === "polygon" && "Полигон"}
          {shapeType === "freehand" && "Рисование"}
          {shapeType === "line" && "Линия"}
          {shapeType === "arrow" && "Стрелка"}
          {shapeType === "text" && "Текст"}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Box display="flex" flexDirection="column" gap={2.5}>
          {/*
            Annotation-only shapes (line / arrow / text) don't have a
            clickable area, so the question dialog is hidden and we
            explain that to the teacher. Same for the right-side content
            type toggle - those shapes are explanation-only by design.
          */}
          {(shapeType === "line" || shapeType === "arrow" || shapeType === "text") && (
            <Box
              sx={{
                px: 2, py: 1.5, borderRadius: "8px",
                bgcolor: "rgba(0,64,176,0.05)",
                border: "1px solid rgba(0,64,176,0.15)",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", display: "block" }}>
                Аннотация
              </Typography>
              <Typography variant="caption" sx={{ color: "#475569" }}>
                Линии, стрелки и текстовые метки — это подписи/пояснения на препарате. Вопросы к ним не привязываются.
              </Typography>
            </Box>
          )}

          {}
          <TextField
            label="Название области (метка)"
            variant="outlined"
            fullWidth
            required
            placeholder="Введите короткое название..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {}
          {contentType === "question" && (
            <Box display="flex" flexDirection="column" gap={2} bgcolor="#f8fafc" p={2.5} borderRadius={2} border="1px solid #e2e8f0">
              <TextField
                label="Текст вопроса"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />

              <Typography variant="body2" fontWeight={700} sx={{ mt: 1, color: "#334155", fontSize: "0.85rem" }}>
                Варианты ответов (отметьте правильный)
              </Typography>

              <RadioGroup
                value={correctOption.toString()}
                onChange={(e) => setCorrectOption(parseInt(e.target.value))}
              >
                <List dense disablePadding>
                  {options.map((option, index) => (
                    <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                      <FormControlLabel
                        value={index.toString()}
                        control={<Radio size="small" color="primary" />}
                        label=""
                        sx={{ mr: 0 }}
                      />
                      <TextField
                        size="small"
                        variant="outlined"
                        fullWidth
                        value={option}
                        onChange={(e) => handleOptionTextChange(index, e.target.value)}
                        placeholder={`Вариант ${index + 1}`}
                      />
                      {options.length > 2 && (
                        <ListItemSecondaryAction sx={{ right: 8 }}>
                          <IconButton edge="end" onClick={() => handleRemoveOption(index)} size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
                </List>
              </RadioGroup>

              <Button
                startIcon={<AddIcon />}
                onClick={handleAddOption}
                variant="text"
                color="primary"
                size="small"
                sx={{ alignSelf: "flex-start", mt: 0.5 }}
              >
                Добавить вариант
              </Button>
            </Box>
          )}

          {}
          {contentType === "question_point" && (
            <Box display="flex" flexDirection="column" gap={2} bgcolor="#f8fafc" p={2.5} borderRadius={2} border="1px solid #e2e8f0">
              <TextField
                label="Текст вопроса"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="напр. Укажите где находится ядро клетки"
              />
            </Box>
          )}

          {}
          {(contentType === "question" || contentType === "question_point" || contentType === "explanation") && (
            <Box display="flex" flexDirection="column" gap={2} bgcolor="#f8fafc" p={2.5} borderRadius={2} border="1px solid #e2e8f0">
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                {contentType === "explanation" ? "Текст пояснения и медиа" : "Объяснение правильного ответа"}
              </Typography>

              <TextField
                label="Текст объяснения"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder={contentType === "explanation" ? "Введите описание интерактивной области..." : "Опишите правильный ответ для студента..."}
              />

              <Typography variant="body2" fontWeight={700} sx={{ mt: 1, color: "#334155", fontSize: "0.85rem" }}>
                Иллюстрация или Видео объяснения (Ссылка или Загрузка)
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="Ссылка на картинку/видео"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <input
                  type="file"
                  id="region-media-upload-question"
                  style={{ display: "none" }}
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="region-media-upload-question">
                  <Tooltip title="Загрузить файл с компьютера">
                    <span>
                      <IconButton
                        color="primary"
                        component="span"
                        disabled={uploading}
                        sx={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          p: 1,
                          "&:hover": { bgcolor: "rgba(0,64,176,0.04)" }
                        }}
                      >
                        {uploading ? <CircularProgress size={20} /> : <AttachFileIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </label>
              </Box>

              {}
              {mediaUrl && (
                <Box sx={{ mt: 1, p: 1.5, border: "1px dashed #cbd5e1", borderRadius: "8px", bgcolor: "#ffffff" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
                    Предпросмотр:
                  </Typography>
                  {getYouTubeEmbedUrl(mediaUrl) ? (
                    <Box sx={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "6px" }}>
                      <iframe
                        src={getYouTubeEmbedUrl(mediaUrl) || ""}
                        title="YouTube Preview"
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                        allowFullScreen
                      />
                    </Box>
                  ) : isVideoUrl(mediaUrl) ? (
                    <video src={mediaUrl} controls style={{ width: "100%", maxHeight: "180px", borderRadius: "6px" }} />
                  ) : (
                    <Box display="flex" justifyContent="center">
                      <img
                        src={mediaUrl}
                        alt="Preview"
                        style={{ maxWidth: "100%", maxHeight: "150px", borderRadius: "6px", objectFit: "contain" }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {}
          {contentType !== "question" && contentType !== "question_point" && contentType !== "explanation" && (
            <Box display="flex" flexDirection="column" gap={2} bgcolor="#f8fafc" p={2.5} borderRadius={2} border="1px solid #e2e8f0">
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                Настройки контента
              </Typography>

              <TextField
                label="Описание"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Короткая аннотация к материалу..."
              />

              <Typography variant="body2" fontWeight={700} sx={{ mt: 1, color: "#334155", fontSize: "0.85rem" }}>
                Ссылка на медиаресурс / файл
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label={
                    contentType === "youtube" ? "Ссылка на YouTube" :
                    contentType === "audio" ? "Аудиофайл (MP3/WAV)" :
                    contentType === "pdf" ? "Документ PDF" :
                    "Внешняя ссылка"
                  }
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://..."
                />
                <input
                  type="file"
                  id="region-media-upload-other"
                  style={{ display: "none" }}
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="region-media-upload-other">
                  <Tooltip title="Загрузить файл с компьютера">
                    <span>
                      <IconButton
                        color="primary"
                        component="span"
                        disabled={uploading}
                        sx={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          p: 1,
                          "&:hover": { bgcolor: "rgba(0,64,176,0.04)" }
                        }}
                      >
                        {uploading ? <CircularProgress size={20} /> : <AttachFileIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </label>
              </Box>

              {}
              {mediaUrl && (
                <Box sx={{ mt: 1, p: 1.5, border: "1px dashed #cbd5e1", borderRadius: "8px", bgcolor: "#ffffff" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
                    Предпросмотр медиафайла:
                  </Typography>
                  {getYouTubeEmbedUrl(mediaUrl) ? (
                    <Box sx={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "6px" }}>
                      <iframe
                        src={getYouTubeEmbedUrl(mediaUrl) || ""}
                        title="YouTube Preview"
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                        allowFullScreen
                      />
                    </Box>
                  ) : isVideoUrl(mediaUrl) ? (
                    <video src={mediaUrl} controls style={{ width: "100%", maxHeight: "180px", borderRadius: "6px" }} />
                  ) : isAudioUrl(mediaUrl) ? (
                    <audio src={mediaUrl} controls style={{ width: "100%" }} />
                  ) : isPdfUrl(mediaUrl) ? (
                    <Box display="flex" alignItems="center" gap={1} p={1} bgcolor="#fee2e2" borderRadius="6px" border="1px solid #fca5a5">
                      <PictureAsPdfIcon color="error" />
                      <Typography variant="body2" fontWeight={600} color="error.dark">
                        Документ PDF ({mediaUrl.split("/").pop()})
                      </Typography>
                    </Box>
                  ) : (
                    <Box display="flex" justifyContent="center">
                      <img
                        src={mediaUrl}
                        alt="Preview"
                        style={{ maxWidth: "100%", maxHeight: "150px", borderRadius: "6px", objectFit: "contain" }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} color="inherit">
          Отмена
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={!title.trim()}>
          Сохранить область
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default RegionEditor;

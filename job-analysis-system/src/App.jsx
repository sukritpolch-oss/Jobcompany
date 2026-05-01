import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, FileText, Download, Calculator,
  ClipboardCheck, Building2, GraduationCap, User,
  ChevronRight, ChevronDown, CheckCircle2, AlertCircle,
  Clock, LayoutDashboard, FileSpreadsheet, Settings,
  Upload, Loader2, X, FileDown,
  Wand2, HardHat, Briefcase, FileSearch, Printer, BookOpen,
  RefreshCw, RotateCcw, Sparkles, Calendar, MapPin, Save, AlignLeft
} from 'lucide-react';

const apiKey = "";

// =====================================================================
// ตัวเลือกด้านกิจนิสัย
// =====================================================================
const BEHAVIOR_OPTIONS = [
  'ความซื่อสัตย์', 'ระเบียบวินัยและตรงต่อเวลา', 'ความรับผิดชอบ', 'ใฝ่เรียนรู้',
  'ขยันและอดทน', 'ประหยัด', 'ความปลอดภัย', 'ความคิดสร้างสรรค์', 'ทำงานเป็นทีม', 'จิตสาธารณะ'
];

const App = () => {
  // ระบบบันทึกงานและดาวน์โหลด
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const fileInputRef = useRef(null);
  const evalFileInputRef = useRef(null);

  // สถานะรูปแบบแบบประเมินและการเลือกกิจนิสัย
  const [activeEvalView, setActiveEvalView] = useState('eval_workplace');
  const [activeReportView, setActiveReportView] = useState('dve0405');
  const [evalFormType, setEvalFormType] = useState('5');
  const [selectedBehaviors, setSelectedBehaviors] = useState([...BEHAVIOR_OPTIONS]);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [activeTab, setActiveTab] = useState('setup');
  const [collapsedWorkplaceTasks, setCollapsedWorkplaceTasks] = useState(new Set());
  const [collapsedWorkplaceSubTasks, setCollapsedWorkplaceSubTasks] = useState(new Set());
  const [statusMessage, setStatusMessage] = useState(null);

  // ข้อมูลพื้นฐานสำหรับรายงาน
  const [config, setConfig] = useState({
    aiProvider: 'gemini',
    userApiKey: '',
    openaiApiKey: '',
    claudeApiKey: '',
    deepseekApiKey: '',
    companyName: '',
    academicYear: '๒๕๖๙',
    startDate: '',
    endDate: '',
    hoursPerDay: 8,
    daysPerWeek: 5,
    weeks: 18,
    trainerName: '',
    trainerPosition: '',
    occupation: '',
    department: ''
  });

  // State เก็บข้อมูล Subject (คงไว้เผื่อการโหลดไฟล์เก่ามาแสดงผล)
  const [subjects, setSubjects] = useState([]);

  const [workplaceMainTasks, setWorkplaceMainTasks] = useState([
    { id: Date.now(), name: '', isAnalyzing: false, isConfirmed: false, subTasks: [] }
  ]);

  const cleanTaskName = (name) => {
    if (!name) return '';
    let cleaned = name.replace(/ศึกษา|เรียนรู้|ทฤษฎี/g, '').trim();
    if (cleaned.startsWith('การ')) {
      cleaned = cleaned.substring(3).trim();
    }
    return cleaned;
  };

  const handleBehaviorToggle = (behavior) => {
    setSelectedBehaviors(prev =>
      prev.includes(behavior) ? prev.filter(b => b !== behavior) : [...prev, behavior]
    );
  };

  // --- Local Data Save/Load Functions ---
  const saveDataLocally = () => {
    showStatus('กำลังบันทึกข้อมูลลงเครื่อง...');
    try {
      const cleanedSubjects = subjects.map(s => {
        const { uploadedFile, previewUrl, ...rest } = s;
        return rest;
      });

      const payload = JSON.stringify({
        config,
        subjects: cleanedSubjects,
        workplaceMainTasks,
        selectedBehaviors
      });

      // เข้ารหัสแบบพื้นฐาน
      const encodedData = btoa(unescape(encodeURIComponent(payload)));
      const blob = new Blob([encodedData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DVE_Backup_${new Date().getTime()}.jobcompany`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus('บันทึกข้อมูลลงเครื่องสำเร็จ!');
    } catch (err) {
      console.error("Save local error:", err);
      showStatus('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleFileUploadLocal = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const resetInputs = () => {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (evalFileInputRef.current) evalFileInputRef.current.value = '';
    };

    const applyParsed = (parsed) => {
      if (!parsed || typeof parsed !== 'object' || (!parsed.config && !parsed.subjects && !parsed.workplaceMainTasks)) {
        showStatus('เปิดไฟล์ไม่สำเร็จ: ไม่พบข้อมูลแผนฝึกอาชีพภายในไฟล์นี้');
        return false;
      }
      if (parsed.config) setConfig(parsed.config);
      if (parsed.subjects) {
        setSubjects(parsed.subjects.map(s => ({ ...s, previewUrl: null, uploadedFile: null })));
      }
      if (parsed.workplaceMainTasks) setWorkplaceMainTasks(parsed.workplaceMainTasks);
      if (parsed.selectedBehaviors) setSelectedBehaviors(parsed.selectedBehaviors);
      return true;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target.result.trim();

      try {
        const parsed = JSON.parse(rawText);
        if (applyParsed(parsed)) showStatus('โหลดและกู้คืนข้อมูลสำเร็จ!');
        resetInputs();
        return;
      } catch (_) {}

      try {
        const decoded = decodeURIComponent(escape(atob(rawText)));
        const parsed = JSON.parse(decoded);
        if (applyParsed(parsed)) showStatus('โหลดและกู้คืนข้อมูลสำเร็จ!');
        resetInputs();
        return;
      } catch (_) {}

      // Fallback
      showStatus('เปิดไฟล์ไม่สำเร็จ: ไฟล์เสียหายหรือไม่รองรับรูปแบบนี้');
      resetInputs();
    };

    reader.onerror = () => {
      showStatus('เปิดไฟล์ไม่สำเร็จ: ไม่สามารถอ่านไฟล์ได้');
      resetInputs();
    };

    reader.readAsText(file, 'UTF-8');
  };

  const showStatus = useCallback((msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  // --- Multi-Model AI Calling Logic ---
  const callAI = async (payload, retries = 5, delay = 2000) => {
    const provider = config.aiProvider || 'gemini';
    const systemPromptText = payload.systemInstruction?.parts?.[0]?.text || '';
    const schemaStr = payload.generationConfig?.responseSchema ? JSON.stringify(payload.generationConfig.responseSchema) : '';
    const jsonInstruction = `\n\nIMPORTANT: You must return the result ONLY as a valid JSON object. Do not include markdown code blocks or any other text. The JSON MUST match exactly this schema: ${schemaStr}`;

    for (let i = 0; i < retries; i++) {
      try {
        let text = "";

        if (provider === 'gemini') {
          const isCustomKey = !!config.userApiKey?.trim();
          const activeKey = isCustomKey ? config.userApiKey.trim() : apiKey;
          const modelVersion = isCustomKey ? "gemini-2.5-flash" : "gemini-2.5-flash-preview-09-2025";
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelVersion}:generateContent?key=${activeKey}`;

          const updatedPayload = {
            ...payload,
            generationConfig: {
              responseMimeType: "application/json",
              ...(payload.generationConfig || {})
            }
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPayload)
          });
          if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
          const result = await response.json();
          text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        } else if (provider === 'openai') {
          const key = config.openaiApiKey?.trim();
          if (!key) throw new Error("กรุณาระบุ OpenAI API Key ในหน้าตั้งค่า");

          const messages = [
            { role: 'system', content: systemPromptText + jsonInstruction },
            { role: 'user', content: payload.contents[0].parts.map(p => p.text).join('\n') }
          ];

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: messages,
              response_format: { type: "json_object" }
            })
          });
          if (!response.ok) throw new Error(`OpenAI Error: ${response.status}`);
          const result = await response.json();
          text = result.choices[0].message.content;

        } else if (provider === 'deepseek') {
          const key = config.deepseekApiKey?.trim();
          if (!key) throw new Error("กรุณาระบุ DeepSeek API Key ในหน้าตั้งค่า");

          const messages = [
            { role: 'system', content: systemPromptText + jsonInstruction },
            { role: 'user', content: payload.contents[0].parts.map(p => p.text).join('\n') }
          ];

          const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: messages,
              response_format: { type: "json_object" }
            })
          });
          if (!response.ok) throw new Error(`DeepSeek Error: ${response.status}`);
          const result = await response.json();
          text = result.choices[0].message.content;

        } else if (provider === 'claude') {
          const key = config.claudeApiKey?.trim();
          if (!key) throw new Error("กรุณาระบุ Claude API Key ในหน้าตั้งค่า");

          const userContent = payload.contents[0].parts.map(p => ({ type: 'text', text: p.text }));

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
              'anthropic-dangerously-allow-browser': 'true'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 4000,
              system: systemPromptText + jsonInstruction,
              messages: [{ role: 'user', content: userContent }]
            })
          });
          if (!response.ok) throw new Error(`Claude Error: ${response.status}`);
          const result = await response.json();
          text = result.content[0].text;
        }

        if (!text) throw new Error("AI ไม่ตอบกลับ");

        try {
          return JSON.parse(text);
        } catch (e) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error("รูปแบบข้อมูลที่ AI ตอบกลับไม่ถูกต้อง");
        }
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
  };

  // --- ส่วนจัดการงานบริษัท (Workplace) ---
  const addWorkplaceMainTask = () => {
    if (workplaceMainTasks.length >= 100) return showStatus("เพิ่มงานหลักได้สูงสุด ๑๐๐ งาน");
    setWorkplaceMainTasks(prev => [...prev, { id: Date.now(), name: '', isAnalyzing: false, isConfirmed: false, subTasks: [] }]);
  };

  const removeWorkplaceMainTask = (id) => {
    setWorkplaceMainTasks(prev => prev.filter(t => t.id !== id));
  };

  const analyzeWorkplaceMainTask = async (taskId) => {
    const activeKey = config.aiProvider === 'openai' ? config.openaiApiKey : config.aiProvider === 'claude' ? config.claudeApiKey : config.aiProvider === 'deepseek' ? config.deepseekApiKey : (config.userApiKey || apiKey);
    if (!activeKey?.trim() && config.aiProvider !== 'gemini') return showStatus(`กรุณาใส่ API Key ของ ${config.aiProvider} ในหน้า '๑. ตั้งค่า' ก่อนใช้งาน`);
    if (config.aiProvider === 'gemini' && !config.userApiKey?.trim() && !apiKey) return showStatus("กรุณาใส่ Gemini API Key ในหน้า '๑. ตั้งค่า' ก่อนใช้งาน");

    const taskToAnalyze = workplaceMainTasks.find(t => t.id === taskId);
    const taskIndex = workplaceMainTasks.findIndex(t => t.id === taskId);
    const tIdx = taskIndex >= 0 ? taskIndex + 1 : 1;

    if (!taskToAnalyze || !taskToAnalyze.name) return showStatus("กรุณาระบุชื่องานหลักก่อนทำการวิเคราะห์");
    setWorkplaceMainTasks(prev => prev.map(t => t.id === taskId ? { ...t, isAnalyzing: true } : t));

    try {
      const systemPrompt = `วิเคราะห์งานหลัก: "${taskToAnalyze.name}" 
      1. แตกเป็น "งานย่อย" 3-5 งาน และสำหรับแต่ละงานย่อย ให้เขียน "ขั้นตอนการปฏิบัติงาน" (Performance Steps) ให้ละเอียดและครบถ้วนที่สุดตามลำดับการทำงานจริง
      2. กำหนดระดับ (1-3) K,S,A,Ap ตามมาตรฐาน v5.0
      3. **สำคัญมาก (จุดประสงค์)**: การเขียน "จุดประสงค์เชิงพฤติกรรม" (objectives) สำหรับ K, S, A, Ap ต้องใช้ "คำกริยาที่วัดผลได้" ห้ามใช้คำว่า รู้จัก, เข้าใจ, ทราบ, รู้
      4. **กฎเหล็ก (ชื่องานย่อย/ขั้นตอน)**: ต้องขึ้นต้นด้วยคำกริยาแสดงการกระทำ และห้ามมีคำว่า "การ", "ศึกษา", "เรียนรู้", "ทฤษฎี"
      5. **กฎเหล็กเพิ่มเติม (งานปฏิบัติการ)**: หากเป็นลักษณะงานช่างหรืองานวิชาชีพ (เช่น ถอด, ประกอบ, ติดตั้ง, ซ่อม, เช็ค, ตรวจสอบ) **ต้องกำหนดขั้นตอนแรกเป็นการ "จัดเตรียมเครื่องมือและอุปกรณ์" และขั้นตอนสุดท้ายเป็นการ "จัดเก็บเครื่องมือและทำความสะอาด" เสมอ**
      6. ระบุ "สื่อ/อุปกรณ์" (equipment) ที่ต้องใช้ในแต่ละขั้นตอน`;

      const generationConfig = {
        responseSchema: {
          type: "OBJECT",
          properties: {
            subTasks: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  workplaceName: { type: "STRING" },
                  detailed_steps: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        step_text: { type: "STRING" },
                        objectives: {
                          type: "OBJECT", properties: { k: { type: "STRING" }, s: { type: "STRING" }, a: { type: "STRING" }, ap: { type: "STRING" } }
                        },
                        levels: {
                          type: "OBJECT", properties: { k: { type: "INTEGER" }, s: { type: "INTEGER" }, a: { type: "INTEGER" }, ap: { type: "INTEGER" } }
                        },
                        equipment: { type: "STRING" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const result = await callAI({ contents: [{ parts: [{ text: `วิเคราะห์งานปฏิบัติสำหรับ: ${taskToAnalyze.name}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig });

      const newSubTasks = (result.subTasks || []).map((st, i) => {
        return {
          ...st,
          id: `W${tIdx}-${i + 1}`,
          name: cleanTaskName(st.workplaceName),
          workplaceName: cleanTaskName(st.workplaceName),
          hours: 10,
          detailed_steps: (st.detailed_steps || []).map(step => ({
            ...step,
          }))
        };
      });

      setWorkplaceMainTasks(prev => prev.map(t => t.id === taskId ? { ...t, subTasks: newSubTasks, isAnalyzing: false } : t));
      showStatus("วิเคราะห์งานสำเร็จ!");
    } catch (e) {
      showStatus("ขัดข้อง: " + e.message);
      setWorkplaceMainTasks(prev => prev.map(t => t.id === taskId ? { ...t, isAnalyzing: false } : t));
    }
  };

  const updateWorkplaceSubtask = (mIdx, sIdx, field, value) => {
    setWorkplaceMainTasks(prev => {
      const next = prev.map(t => ({ ...t, subTasks: [...(t.subTasks || [])] }));
      if (sIdx === null) {
        next[mIdx][field] = value;
      } else {
        next[mIdx].subTasks[sIdx] = { ...next[mIdx].subTasks[sIdx], [field]: value };
      }
      return next;
    });
  };

  const removeWorkplaceSubtask = (mIdx, sIdx) => {
    if (!window.confirm("ต้องการลบงานย่อยนี้ใช่หรือไม่?")) return;
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      next[mIdx].subTasks.splice(sIdx, 1);
      return next;
    });
  };

  const addWorkplaceSubtaskLocal = (mIdx) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      const tIdx = mIdx + 1;
      const existingSubTasks = next[mIdx].subTasks || [];
      let maxSuffix = 0;
      existingSubTasks.forEach(st => {
        const parts = String(st.id).split('-');
        if (parts.length > 1) {
          const suffix = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(suffix)) maxSuffix = Math.max(maxSuffix, suffix);
        }
      });
      const newSuffix = maxSuffix + 1;
      next[mIdx].subTasks.push({
        id: `W${tIdx}-${newSuffix}`,
        workplaceName: '',
        name: '-',
        hours: 10,
        detailed_steps: [],
        isAnalyzing: false
      });
      next[mIdx].isConfirmed = false;
      return next;
    });
  };

  const updateWorkplaceStepField = (mIdx, sIdx, stepIdx, field, value) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      next[mIdx].subTasks[sIdx].detailed_steps[stepIdx][field] = value;
      return next;
    });
  };

  const removeWorkplaceStep = (mIdx, sIdx, stepIdx) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      next[mIdx].subTasks[sIdx].detailed_steps.splice(stepIdx, 1);
      return next;
    });
  };

  const addWorkplaceStepLocal = (mIdx, sIdx) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      if (!next[mIdx].subTasks[sIdx].detailed_steps) {
        next[mIdx].subTasks[sIdx].detailed_steps = [];
      }
      next[mIdx].subTasks[sIdx].detailed_steps.push({
        step_text: '',
        objectives: { k: 'ระบุพฤติกรรม', s: 'ระบุพฤติกรรม', a: 'ระบุพฤติกรรม', ap: 'ระบุพฤติกรรม' },
        levels: { k: 1, s: 1, a: 1, ap: 1 },
        equipment: 'ของจริง / คู่มือ',
        isAnalyzing: false
      });
      next[mIdx].isConfirmed = false;
      return next;
    });
  };

  const analyzeSingleWorkplaceSubtask = async (mIdx, sIdx) => {
    const activeKey = config.aiProvider === 'openai' ? config.openaiApiKey : config.aiProvider === 'claude' ? config.claudeApiKey : config.aiProvider === 'deepseek' ? config.deepseekApiKey : (config.userApiKey || apiKey);
    if (!activeKey?.trim() && config.aiProvider !== 'gemini') return showStatus(`กรุณาใส่ API Key ของ ${config.aiProvider} ในหน้า '๑. ตั้งค่า' ก่อนใช้งาน`);
    if (config.aiProvider === 'gemini' && !config.userApiKey?.trim() && !apiKey) return showStatus("กรุณาใส่ Gemini API Key ในหน้า '๑. ตั้งค่า' ก่อนใช้งาน");

    const mainTask = workplaceMainTasks[mIdx];
    const subTask = mainTask.subTasks[sIdx];

    if (!subTask.workplaceName) return showStatus("กรุณาระบุชื่องานย่อยก่อนวิเคราะห์");

    setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].isAnalyzing = true; return n; });

    try {
      const systemPrompt = `วิเคราะห์งานย่อย: "${subTask.workplaceName}" ภายใต้งานหลัก: "${mainTask.name}"
      1. แตกเป็น "ขั้นตอนการปฏิบัติงาน" (Performance Steps) 3-8 ขั้นตอน
      2. กำหนดระดับ (1-3) K,S,A,Ap และ "จุดประสงค์เชิงพฤติกรรม" ห้ามใช้คำว่า "รู้จัก", "เข้าใจ"
      3. ห้ามมีคำว่า "การ", "ศึกษา", "เรียนรู้" ในขั้นตอนและขั้นตอนต้องขึ้นต้นด้วยคำกริยา
      4. **กฎเหล็กเพิ่มเติม (งานปฏิบัติการ)**: หากเป็นลักษณะงานช่างหรืองานวิชาชีพ (เช่น ถอด, ประกอบ, ติดตั้ง, ซ่อม, เช็ค, ตรวจสอบ) **ต้องกำหนดขั้นตอนแรกเป็นการ "จัดเตรียมเครื่องมือและอุปกรณ์" และขั้นตอนสุดท้ายเป็นการ "จัดเก็บเครื่องมือและทำความสะอาด" เสมอ**
      5. ระบุ "สื่อ/อุปกรณ์" (equipment)`;

      const generationConfig = {
        responseSchema: {
          type: "OBJECT",
          properties: {
            detailed_steps: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  step_text: { type: "STRING" },
                  objectives: { type: "OBJECT", properties: { k: { type: "STRING" }, s: { type: "STRING" }, a: { type: "STRING" }, ap: { type: "STRING" } } },
                  levels: { type: "OBJECT", properties: { k: { type: "INTEGER" }, s: { type: "INTEGER" }, a: { type: "INTEGER" }, ap: { type: "INTEGER" } } },
                  equipment: { type: "STRING" }
                }
              }
            }
          }
        }
      };

      const result = await callAI({ contents: [{ parts: [{ text: `วิเคราะห์งานย่อย: ${subTask.workplaceName}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig });

      setWorkplaceMainTasks(prev => {
        const next = [...prev];
        const cleanedSteps = (result.detailed_steps || []).map(step => ({ ...step }));
        next[mIdx].subTasks[sIdx].detailed_steps = cleanedSteps;
        next[mIdx].subTasks[sIdx].name = cleanTaskName(subTask.workplaceName);
        next[mIdx].subTasks[sIdx].isAnalyzing = false;
        return next;
      });
      showStatus("วิเคราะห์งานย่อยและขั้นตอนสำเร็จ");
    } catch (e) {
      showStatus("ขัดข้อง: " + e.message);
      setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].isAnalyzing = false; return n; });
    }
  };

  const analyzeSingleWorkplaceStep = async (mIdx, sIdx, stepIdx) => {
    const activeKey = config.aiProvider === 'openai' ? config.openaiApiKey : config.aiProvider === 'claude' ? config.claudeApiKey : config.aiProvider === 'deepseek' ? config.deepseekApiKey : (config.userApiKey || apiKey);
    if (!activeKey?.trim() && config.aiProvider !== 'gemini') return showStatus(`กรุณาใส่ API Key ของ ${config.aiProvider} ในหน้า '๑. ตั้งค่า' ก่อนใช้งาน`);
    if (config.aiProvider === 'gemini' && !config.userApiKey?.trim() && !apiKey) return showStatus("กรุณาใส่ Gemini API Key ในหน้า '๑. ตั้งค่า' ก่อนใช้งาน");

    const step = workplaceMainTasks[mIdx].subTasks[sIdx].detailed_steps[stepIdx];
    if (!step.step_text) return showStatus("กรุณาระบุขั้นตอนการทำงานก่อนวิเคราะห์");

    setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].detailed_steps[stepIdx].isAnalyzing = true; return n; });

    try {
      const systemPrompt = `วิเคราะห์ขั้นตอนการทำงาน: "${step.step_text}"
      กำหนดจุดประสงค์เชิงพฤติกรรม (K, S, A, Ap) ด้วย Action Verbs และระดับความสามารถ (1-3)
      **กฎเหล็ก**: "จุดประสงค์เชิงพฤติกรรม" ทุกข้อต้องขึ้นต้นด้วยคำกริยาที่วัดผลได้ ห้ามใช้คำว่า "รู้จัก", "เข้าใจ", "ทราบ", "รู้" โดยเด็ดขาด
      - K (ความรู้): เช่น บอก, ระบุ, อธิบาย, บรรยาย, คำนวณ
      - S (ทักษะ): เช่น ปฏิบัติ, สาธิต, สร้าง, ประกอบ, ถอด, ตรวจสอบ, วัดขนาด
      - A (เจตคติ): เช่น ยอมรับ, ให้ความร่วมมือ, ระมัดระวัง, รับผิดชอบ, ดูแลรักษา
      - Ap (ประยุกต์): เช่น ประยุกต์ใช้, แก้ปัญหา, วางแผน, ปรับปรุง, ตัดสินใจ
      - ระบุ "สื่อ/อุปกรณ์" (equipment) ที่ต้องใช้ในขั้นตอนนี้ให้ชัดเจน เขียนเป็นข้อๆ คั่นด้วย (,)`;

      const generationConfig = {
        responseSchema: {
          type: "OBJECT",
          properties: {
            objectives: { type: "OBJECT", properties: { k: { type: "STRING" }, s: { type: "STRING" }, a: { type: "STRING" }, ap: { type: "STRING" } } },
            levels: { type: "OBJECT", properties: { k: { type: "INTEGER" }, s: { type: "INTEGER" }, a: { type: "INTEGER" }, ap: { type: "INTEGER" } } },
            equipment: { type: "STRING" }
          }
        }
      };

      const result = await callAI({ contents: [{ parts: [{ text: `วิเคราะห์ขั้นตอน: ${step.step_text}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig });

      setWorkplaceMainTasks(prev => {
        const next = [...prev];
        next[mIdx].subTasks[sIdx].detailed_steps[stepIdx].objectives = result.objectives || step.objectives;
        next[mIdx].subTasks[sIdx].detailed_steps[stepIdx].levels = result.levels || step.levels;
        next[mIdx].subTasks[sIdx].detailed_steps[stepIdx].equipment = result.equipment || step.equipment || 'ของจริง / คู่มือ';
        next[mIdx].subTasks[sIdx].detailed_steps[stepIdx].isAnalyzing = false;
        return next;
      });
      showStatus("วิเคราะห์ขั้นตอนสำเร็จ");
    } catch (e) {
      showStatus("ขัดข้อง: " + e.message);
      setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].detailed_steps[stepIdx].isAnalyzing = false; return n; });
    }
  };

  const toggleConfirmWorkplaceTask = (mIdx) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      next[mIdx].isConfirmed = !next[mIdx].isConfirmed;
      return next;
    });
    const isNowConfirmed = !workplaceMainTasks[mIdx].isConfirmed;
    if (isNowConfirmed) {
      showStatus("ยืนยันข้อมูลเรียบร้อย นำไปจัดทำรายงานได้");
    }
  };

  // --- Calculations ---
  const totalTrainingHours = useMemo(() => {
    return (Number(config.hoursPerDay) || 0) * (Number(config.daysPerWeek) || 0) * (Number(config.weeks) || 0);
  }, [config.hoursPerDay, config.daysPerWeek, config.weeks]);

  const trainingDuration = useMemo(() => {
    if (!config.startDate || !config.endDate) return null;
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const diffMs = end - start;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    return { weeks, days, totalDays };
  }, [config.startDate, config.endDate]);

  const trainingWeeksWarning = useMemo(() => {
    if (!trainingDuration) return null;
    const minWeeks = 18;
    if (trainingDuration.weeks < minWeeks) {
      return `ระยะเวลาฝึกไม่ครบตามเกณฑ์! ต้องไม่น้อยกว่า ${minWeeks} สัปดาห์ (ปัจจุบัน ${trainingDuration.weeks} สัปดาห์ ${trainingDuration.days} วัน)`;
    }
    return null;
  }, [trainingDuration]);

  const workplaceTasksFlat = useMemo(() => {
    return workplaceMainTasks.flatMap((m, mIdx) => (m.subTasks || []).map((s, sIdx) => ({
      ...s,
      parentMainTaskName: cleanTaskName(m.name),
      mainTaskIndex: mIdx + 1,
      subTaskIndex: `${mIdx + 1}.${sIdx + 1}`
    })));
  }, [workplaceMainTasks]);

  // คำนวณหา unmapped tasks (คงไว้เพื่อรองรับไฟล์เดิมที่เคยจัดเก็บ)
  const unmappedTasks = useMemo(() => {
    const allSubTasks = subjects
      .filter(s => s.isAnalyzed)
      .flatMap(s => (s.mainTasks || []).flatMap(mt => (mt.subTasks || []).map(st => ({
        ...st,
        subjectId: s.id,
        subjectName: s.name,
        mainTaskName: cleanTaskName(mt.name),
        mainTaskId: mt.id
      }))));
      
    const mappedIdsSet = new Set();
    workplaceTasksFlat.forEach(wt => {
      if (wt.id) {
        String(wt.id).split(',').forEach(id => mappedIdsSet.add(id.trim().toUpperCase()));
      }
      if (wt.detailed_steps) {
        wt.detailed_steps.forEach(step => {
          if (step.subjectTaskId) {
            String(step.subjectTaskId).split(',').forEach(id => mappedIdsSet.add(id.trim().toUpperCase()));
          }
        });
      }
    });

    return allSubTasks.filter(st => !mappedIdsSet.has(String(st.id).trim().toUpperCase()));
  }, [subjects, workplaceTasksFlat]);

  const exportToWord = (elementId, filename) => {
    const content = document.getElementById(elementId);
    if (!content) return;
    const isLandscape = content.classList.contains('Section2');
    const sectionClass = isLandscape ? 'Section2' : 'Section1';
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        @page Section1 { size: 21.0cm 29.7cm; margin: 1.2cm; }
        @page Section2 { size: 29.7cm 21.0cm; margin: 1.0cm; mso-page-orientation: landscape; }
        div.Section1 { page: Section1; }
        div.Section2 { page: Section2; }
        body, p, div, span, td, th { font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; }
        table { border-collapse: collapse; width: 100%; border: 1px solid black; margin-bottom: 10px; font-size: 16pt; }
        th, td { border: 1px solid black; padding: 4px; vertical-align: top; }
        .text-center { text-align: center; } .font-bold { font-weight: bold; }
        .page-break { page-break-after: always; }
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; height: 140px; text-align: left; padding: 5px; font-weight: bold; }
        .report-header { line-height: 1.6; margin-bottom: 15px; }
        h2 { font-size: 18pt; font-weight: bold; }
      </style></head><body><div class="${sectionClass}">`;
    const footer = "</div></body></html>";
    const html = header + content.innerHTML + footer;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename + '.doc';
    link.click();
  };

  const setupFields = [
    { k: 'companyName', l: 'ชื่อสถานประกอบการ', i: Briefcase },
    { k: 'academicYear', l: 'ปีการศึกษา', i: Calendar },
    { k: 'startDate', l: 'วันเริ่มฝึก (ฝอ.1)', i: Clock },
    { k: 'endDate', l: 'วันสิ้นสุดฝึก (ฝอ.1)', i: Clock },
    { k: 'trainerName', l: 'ชื่อ-สกุล ครูฝึกในสถานประกอบการ', i: User },
    { k: 'trainerPosition', l: 'ตำแหน่งครูฝึกในสถานประกอบการ', i: Briefcase },
    { k: 'occupation', l: 'อาชีพ / ตำแหน่งงาน', i: HardHat },
    { k: 'department', l: 'ส่วนงาน / จุดฝึก', i: Building2 }
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">

      {/* แถบชื่อระบบ (Corporate Style) */}
      <div className="bg-slate-900 text-white py-4 px-6 shadow-md z-[70] relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ClipboardCheck size={20} className="shrink-0" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">ระบบวิเคราะห์งานในสถานประกอบการ</h1>
            <p className="text-[11px] text-slate-400">Job & Task Analysis Platform</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <Sparkles size={14} className="text-blue-400" />
          <span>พัฒนาโดย <strong className="text-white">นายสุกฤษฏิ์พล โชติอรรฐพล</strong> ศึกษานิเทศก์ชำนาญการพิเศษ</span>
        </div>
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 flex items-center justify-between px-4 md:px-6 shadow-sm">
        {/* Navigation Tabs (Dashboard Style) */}
        <div className="hidden lg:flex gap-2">
          {[
            { id: 'setup', l: '๑. ตั้งค่าข้อมูล', i: Settings },
            { id: 'workplace', l: '๒. วิเคราะห์งานสถานประกอบการ', i: Building2 },
            { id: 'reports', l: '๓. เอกสารรายงาน', i: FileText },
            { id: 'evaluation', l: '๔. แบบประเมิน', i: ClipboardCheck },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}>
              <t.i size={16} /> {t.l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <input type="file" accept=".jobcompany" ref={fileInputRef} onChange={handleFileUploadLocal} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition duration-200 flex items-center gap-2 text-xs font-semibold rounded-md" title="อัปโหลดไฟล์งานเดิม">
              <Upload size={16} />
              <span className="hidden md:inline">โหลดไฟล์ (.jobcompany)</span>
            </button>
            <div className="w-px h-4 bg-slate-300"></div>
            <button onClick={saveDataLocally} className="p-2 text-white bg-blue-600 hover:bg-blue-700 transition duration-200 flex items-center gap-2 text-xs font-semibold rounded-md shadow-sm" title="บันทึกงานลงเครื่อง">
              <Save size={16} />
              <span className="hidden md:inline">บันทึกข้อมูล</span>
            </button>
          </div>
          <button onClick={() => window.location.reload()} className="p-2 ml-2 text-slate-400 hover:text-blue-600 transition active:rotate-180 duration-500 rounded-lg hover:bg-slate-100" title="รีเฟรชหน้าจอ"><RotateCcw size={16} /></button>
        </div>
      </header>

      {statusMessage && (
        <div className="fixed top-24 right-6 z-[100] bg-slate-800 text-white px-5 py-3 rounded-lg shadow-lg border border-slate-700 animate-in slide-in-from-right-8 duration-300 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-400" size={18} />
          <span className="text-sm font-medium">{statusMessage}</span>
        </div>
      )}

      {/* Modal แจ้งเตือนเมื่อเข้าสู่ระบบ (หน้า Welcome แรก) */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 border-t-4 border-blue-600">
            <div className="flex justify-center mb-5">
              <div className="bg-blue-50 p-4 rounded-full text-blue-600">
                <AlignLeft size={36} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 mb-3">ข้อกำหนดการใช้งานระบบ</h3>
            <div className="text-center text-sm text-slate-600 mb-8 leading-relaxed space-y-3">
              <p>ระบบนี้ถูกพัฒนาขึ้นเพื่อสนับสนุนการวิเคราะห์งานและลดภาระในการจัดทำเอกสารการฝึกประสบการณ์</p>
              <p className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs border border-amber-200">
                <strong>หมายเหตุ:</strong> การวิเคราะห์ข้อมูลจาก AI เป็นการสร้างเนื้อหาเบื้องต้นตามอัลกอริทึม โปรดตรวจสอบความถูกต้องและปรับแก้ให้เหมาะสมกับบริบทงานจริงก่อนนำไปใช้
              </p>
            </div>
            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 active:scale-95 transition-all text-sm"
            >
              รับทราบและเริ่มต้นใช้งาน
            </button>
          </div>
        </div>
      )}

      {/* Modal ยืนยันก่อนดาวน์โหลดรายงาน */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDownloadConfirm(null)}>
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* กรณีเป็นแบบประเมินแต่ยังไม่มีข้อมูล */}
            {['eval_workplace', 'eval_supervision', 'dve1102'].includes(showDownloadConfirm) && workplaceTasksFlat.length === 0 ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-bold text-slate-800">ดาวน์โหลดเอกสาร</span>
                  <button
                    onClick={() => setShowDownloadConfirm(null)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                    <FileText size={32} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-800 mb-1">ยังไม่มีข้อมูลการวิเคราะห์</p>
                    <p className="text-xs text-slate-500 mb-5">กรุณาเพิ่มข้อมูลงานในสถานประกอบการ หรืออัปโหลดไฟล์ที่บันทึกไว้ (.jobcompany) ก่อนสร้างเอกสาร</p>
                  </div>
                  <button
                    onClick={() => { evalFileInputRef.current.click(); setShowDownloadConfirm(null); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2 w-full justify-center"
                  >
                    <Upload size={16} /> โหลดไฟล์ข้อมูล (.jobcompany)
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-5">
                  <span className="text-sm font-bold text-slate-800">ยืนยันการดาวน์โหลด</span>
                  <button onClick={() => setShowDownloadConfirm(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                </div>
                <div className="flex justify-center mb-4">
                  <div className="bg-amber-50 p-3 rounded-full text-amber-500 border border-amber-100">
                    <AlertCircle size={32} />
                  </div>
                </div>
                <p className="text-center text-sm text-slate-600 mb-6 leading-relaxed">
                  กรุณาตรวจสอบความถูกต้องของข้อมูลอีกครั้ง<br />ก่อนนำเอกสารไปใช้งานจริง
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDownloadConfirm(null)}
                    className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 active:scale-95 transition-all text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      if (showDownloadConfirm === 'reports') {
                        exportToWord('dve-all-area', 'Job_Analysis_Complete');
                      } else if (showDownloadConfirm === 'dve0402') {
                        exportToWord('dve-0402-area', 'DVE-04-02_วิเคราะห์งาน');
                      } else if (showDownloadConfirm === 'dve0403') {
                        exportToWord('dve-0403-area', 'DVE-04-03_วิเคราะห์เทียบรายวิชา');
                      } else if (showDownloadConfirm === 'dve0404') {
                        exportToWord('dve-0404-area', 'DVE-04-04_รายวิชาฝึก');
                      } else if (showDownloadConfirm === 'dve0405') {
                        exportToWord('dve-0405-area', 'DVE-04-05_แผนฝึกตลอดหลักสูตร');
                      } else if (showDownloadConfirm === 'dve0406') {
                        exportToWord('dve-0406-area', 'DVE-04-06_แผนฝึกรายหน่วย');
                      } else if (showDownloadConfirm === 'eval_workplace') {
                        exportToWord('dve-eval-workplace-area', 'Evaluation_Workplace');
                      } else if (showDownloadConfirm === 'eval_supervision') {
                        exportToWord('dve-supervision-area', 'Evaluation_Supervision');
                      } else if (showDownloadConfirm === 'dve1102') {
                        exportToWord('dve-11-02-area', 'DVE_11_02_Summary');
                      }
                      setShowDownloadConfirm(null);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all text-sm"
                  >
                    ดาวน์โหลด
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Terms of Service (Main App) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-lg font-bold text-slate-900">ข้อตกลงและเงื่อนไข (Terms of Service)</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
              <div className="bg-slate-50 p-4 rounded-lg text-center font-medium text-slate-700 border border-slate-200">
                © 2026 สุกฤษฏิ์พล โชติอรรฐพล. All Rights Reserved.
              </div>
              <p>เนื้อหา ซอร์สโค้ด กราฟิก โลโก้ และซอฟต์แวร์ทั้งหมดในเว็บไซต์นี้ เป็นทรัพย์สินของผู้พัฒนาแต่เพียงผู้เดียว และได้รับความคุ้มครองตามกฎหมายลิขสิทธิ์</p>
              <div>
                <h4 className="font-semibold text-slate-800 text-base mb-2">ข้อห้าม</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>ห้ามคัดลอก (Copy), ทำซ้ำ (Reproduce) หรือดัดแปลง (Modify)</strong> ส่วนใดส่วนหนึ่งของระบบ</li>
                  <li><strong>ห้ามทำวิศวกรรมย้อนกลับ (Reverse Engineering)</strong> เพื่อดูซอร์สโค้ด</li>
                  <li><strong>ห้ามนำไปเผยแพร่ต่อ (Distribute)</strong> เพื่อหวังผลกำไรโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-base mb-2">สิทธิ์การใช้งาน</h4>
                <p>ผู้พัฒนาอนุญาตให้ผู้ใช้เข้าถึงและใช้งานระบบเพื่อวัตถุประสงค์ <strong>ในการจัดทำแผนฝึกอาชีพและฝึกประสบการณ์สมรรถนะอาชีพเท่านั้น</strong> โดยเป็นการอนุญาตแบบจำกัด และไม่สามารถโอนสิทธิ์ให้ผู้อื่นได้</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-base mb-2">การจำกัดความรับผิดชอบ</h4>
                <p>ผู้พัฒนาจะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดจากการใช้งานระบบ หรือการที่ไม่สามารถเข้าใช้งานระบบได้ในบางช่วงเวลา</p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-200 text-right">
              <button onClick={() => setShowTermsModal(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium shadow-sm hover:bg-slate-900 active:scale-95 transition-all text-sm">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* SETUP TAB */}
        {activeTab === 'setup' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Settings size={20} /></div>
                <h2 className="text-lg font-bold text-slate-800">การตั้งค่าและกำหนดข้อมูลพื้นฐาน</h2>
              </div>

              <div className="mb-8 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Wand2 size={16} className="text-blue-500" /> ตั้งค่า AI Assistant (API Key)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">ผู้ให้บริการ AI</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                      value={config.aiProvider || 'gemini'}
                      onChange={e => setConfig({ ...config, aiProvider: e.target.value })}
                    >
                      <option value="gemini">Google Gemini (แนะนำ)</option>
                      <option value="openai">ChatGPT (OpenAI)</option>
                      <option value="claude">Claude (Anthropic)</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">API Key สำหรับ {config.aiProvider === 'openai' ? 'ChatGPT' : config.aiProvider === 'claude' ? 'Claude' : config.aiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'}</label>
                    {(!config.aiProvider || config.aiProvider === 'gemini') && (
                      <input type="password" placeholder="วาง Gemini API Key ที่นี่..." className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white font-mono" value={config.userApiKey || ''} onChange={e => setConfig({ ...config, userApiKey: e.target.value })} />
                    )}
                    {config.aiProvider === 'openai' && (
                      <input type="password" placeholder="วาง OpenAI API Key (sk-...) ที่นี่..." className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white font-mono" value={config.openaiApiKey || ''} onChange={e => setConfig({ ...config, openaiApiKey: e.target.value })} />
                    )}
                    {config.aiProvider === 'claude' && (
                      <input type="password" placeholder="วาง Anthropic API Key ที่นี่..." className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white font-mono" value={config.claudeApiKey || ''} onChange={e => setConfig({ ...config, claudeApiKey: e.target.value })} />
                    )}
                    {config.aiProvider === 'deepseek' && (
                      <input type="password" placeholder="วาง DeepSeek API Key ที่นี่..." className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white font-mono" value={config.deepseekApiKey || ''} onChange={e => setConfig({ ...config, deepseekApiKey: e.target.value })} />
                    )}

                    {(!config.aiProvider || config.aiProvider === 'gemini') && (
                      <div className="mt-1.5 text-right">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center justify-end gap-1 transition-colors">
                          ขอรับ API Key ฟรี &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {setupFields.map(f => (
                  <div key={f.k}>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5"><f.i size={14} className="text-slate-400" /> {f.l}</label>
                    <input
                      type={f.k === 'startDate' || f.k === 'endDate' ? 'date' : 'text'}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                      value={config[f.k] || ''}
                      onChange={e => {
                        const newConfig = { ...config, [f.k]: e.target.value };
                        if (f.k === 'startDate' || f.k === 'endDate') {
                          const s = f.k === 'startDate' ? e.target.value : newConfig.startDate;
                          const en = f.k === 'endDate' ? e.target.value : newConfig.endDate;
                          if (s && en) {
                            const diff = Math.floor((new Date(en) - new Date(s)) / (1000 * 60 * 60 * 24));
                            if (diff > 0) newConfig.weeks = Math.floor(diff / 7);
                          }
                        }
                        setConfig(newConfig);
                      }}
                    />
                  </div>
                ))}
                
                {/* ข้อมูลเวลาฝึก */}
                <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-5">
                   <div>
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5"><Clock size={14} className="text-slate-400" /> ชั่วโมง/วัน</label>
                      <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" value={config.hoursPerDay} onChange={e => setConfig({ ...config, hoursPerDay: e.target.value })} />
                   </div>
                   <div>
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5"><Calendar size={14} className="text-slate-400" /> วัน/สัปดาห์</label>
                      <input type="number" min="1" max="7" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" value={config.daysPerWeek} onChange={e => setConfig({ ...config, daysPerWeek: e.target.value })} />
                   </div>
                   <div>
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5"><Calendar size={14} className="text-slate-400" /> จำนวนสัปดาห์</label>
                      <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" value={config.weeks} onChange={e => setConfig({ ...config, weeks: e.target.value })} />
                   </div>
                </div>

                <div className="md:col-span-2 bg-blue-50 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between border border-blue-100 mt-2">
                   <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <div className="bg-blue-100 p-2 rounded-md text-blue-700"><Clock size={20} /></div>
                      <div>
                        <p className="text-xs text-blue-600 font-semibold">เวลาฝึกปฏิบัติรวมทั้งหมด</p>
                        <p className="text-lg font-bold text-blue-900">{totalTrainingHours} <span className="text-sm font-normal">ชั่วโมง</span></p>
                      </div>
                   </div>
                   {trainingDuration && (
                     <div className="text-right text-xs text-slate-600">
                        คำนวณจากวันที่: <span className="font-semibold text-slate-800">{trainingDuration.weeks} สัปดาห์ {trainingDuration.days > 0 ? `${trainingDuration.days} วัน` : ''}</span>
                     </div>
                   )}
                </div>

                {/* แจ้งเตือนหากสัปดาห์ไม่ครบตามเกณฑ์ */}
                {trainingWeeksWarning && (
                  <div className="md:col-span-2 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-amber-800">{trainingWeeksWarning}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WORKPLACE TAB (Job Analysis Dashboard) */}
        {activeTab === 'workplace' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            {/* Info Header */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 space-y-1.5">
              <p className="text-base font-bold text-slate-800">การวิเคราะห์งานในสถานประกอบการ</p>
              <p>
                สถานประกอบการ&nbsp;
                <span className="border-b border-dotted border-slate-400 pb-0.5 min-w-[200px] inline-block">
                  {config.companyName || <span className="text-slate-300">........................................</span>}
                </span>
              </p>
              <p>
                ชื่อครูฝึกในสถานประกอบการ&nbsp;
                <span className="border-b border-dotted border-slate-400 pb-0.5 min-w-[200px] inline-block">
                  {config.trainerName || <span className="text-slate-300">........................................</span>}
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <HardHat className="text-blue-600" size={20} /> โครงสร้างงานในสถานประกอบการ
                </h2>
                <p className="text-xs text-slate-500 mt-1">แบ่งงานหลัก, งานย่อย และวิเคราะห์ขั้นตอนการปฏิบัติงาน (Task Analysis)</p>
              </div>
              <button onClick={addWorkplaceMainTask} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                <Plus size={16} /> เพิ่มกลุ่มงานหลัก
              </button>
            </div>

            <div className="space-y-6">
              {workplaceMainTasks.map((main, mIdx) => (
                <div key={main.id} className={`bg-white rounded-xl border shadow-sm relative group transition-all duration-200 ${main.isConfirmed ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200 hover:border-blue-300'}`}>
                  
                  {/* Header งานหลัก */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-500 uppercase">งานหลัก {mIdx + 1}</span>
                        {main.isConfirmed && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1"><CheckCircle2 size={10} /> ยืนยันแล้ว</span>}
                      </div>
                      <input 
                        className={`w-full bg-white px-3 py-2 rounded-md border text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${main.isConfirmed ? 'border-transparent text-slate-700 bg-transparent px-0' : 'border-slate-300 text-slate-900'}`} 
                        placeholder="ระบุชื่องานหลัก (Duty)..." 
                        value={main.name || ''} 
                        onChange={e => updateWorkplaceSubtask(mIdx, null, 'name', e.target.value)} 
                        readOnly={main.isConfirmed} 
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                      <button 
                        onClick={() => analyzeWorkplaceMainTask(main.id)} 
                        disabled={main.isAnalyzing || !main.name || main.isConfirmed} 
                        className="flex-1 md:flex-none py-2 px-4 bg-slate-800 text-white rounded-md text-xs font-medium hover:bg-slate-900 transition flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        {main.isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} {main.isAnalyzing ? 'กำลังวิเคราะห์...' : 'AI ช่วยแตกงานย่อย'}
                      </button>
                      {!main.isConfirmed && (
                        <button onClick={() => removeWorkplaceMainTask(main.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </div>

                  {/* Body งานย่อย */}
                  <div className="p-5 space-y-4">
                    {(main.subTasks || []).map((sub, sIdx) => (
                      <div key={sIdx} className={`bg-white p-4 rounded-lg border flex flex-col gap-4 transition-all duration-200 ${main.isConfirmed ? 'border-slate-100' : 'border-slate-200 shadow-sm'}`}>
                        
                        {/* Header งานย่อย */}
                        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-bold text-slate-500 w-8">{mIdx + 1}.{sIdx + 1}</span>
                          </div>
                          
                          <div className="flex-1 w-full flex items-center gap-2">
                            <input
                              className={`flex-1 text-sm font-medium bg-transparent border-b border-dashed outline-none py-1 focus:border-blue-500 transition-colors ${main.isConfirmed ? 'border-transparent text-slate-700' : 'border-slate-300 text-slate-900'}`}
                              value={sub.workplaceName || ''}
                              onChange={(e) => updateWorkplaceSubtask(mIdx, sIdx, 'workplaceName', e.target.value)}
                              placeholder="ระบุชื่องานย่อย (Task)..."
                              readOnly={main.isConfirmed}
                            />
                            {!main.isConfirmed && (
                              <button type="button" onClick={() => analyzeSingleWorkplaceSubtask(mIdx, sIdx)} disabled={sub.isAnalyzing || !sub.workplaceName} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded disabled:bg-slate-50 disabled:text-slate-300 transition" title="ให้ AI วิเคราะห์ขั้นตอน">
                                {sub.isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200 shrink-0">
                              <Clock size={12} className="text-slate-400" />
                              <input 
                                type="number" 
                                className="w-10 text-center bg-transparent text-xs font-bold text-slate-700 outline-none" 
                                value={sub.hours || 0} 
                                onChange={e => updateWorkplaceSubtask(mIdx, sIdx, 'hours', Number(e.target.value))} 
                                readOnly={main.isConfirmed} 
                              />
                              <span className="text-[10px] text-slate-500">ชม.</span>
                            </div>
                            
                            {(sub.detailed_steps || []).length > 0 && (
                              <button
                                onClick={() => setCollapsedWorkplaceSubTasks(prev => { const s = new Set(prev); s.has(sub.id) ? s.delete(sub.id) : s.add(sub.id); return s; })}
                                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
                              >
                                {collapsedWorkplaceSubTasks.has(sub.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                            {!main.isConfirmed && (
                              <button onClick={() => removeWorkplaceSubtask(mIdx, sIdx)} className="text-slate-300 hover:text-red-500 transition"><X size={16} /></button>
                            )}
                          </div>
                        </div>
                        
                        {/* ขั้นตอนปฏิบัติงาน */}
                        <div className={`pl-4 md:pl-10 space-y-2 ${collapsedWorkplaceSubTasks.has(sub.id) ? 'hidden' : 'block'}`}>
                          {(sub.detailed_steps || []).length > 0 && (
                             <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">ขั้นตอนการปฏิบัติงาน (Steps)</div>
                          )}
                          {sub.detailed_steps?.map((step, si) => (
                            <div key={si} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm group">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs text-slate-400 w-4 text-right">{si + 1}.</span>
                                <input
                                  className={`flex-1 bg-transparent border-b border-dashed outline-none py-1 focus:border-blue-500 text-xs text-slate-700 ${main.isConfirmed ? 'border-transparent' : 'border-slate-200'}`}
                                  value={step.step_text || ''}
                                  onChange={(e) => updateWorkplaceStepField(mIdx, sIdx, si, 'step_text', e.target.value)}
                                  placeholder="ระบุขั้นตอนการทำงาน..."
                                  readOnly={main.isConfirmed}
                                />
                              </div>
                              <div className="flex items-center gap-2 pl-6 sm:pl-0">
                                <div className="flex items-center gap-1 border-b border-dashed border-slate-200 focus-within:border-blue-500 pb-0.5">
                                  <Briefcase size={10} className="text-slate-400 shrink-0" />
                                  <input
                                    className={`w-24 sm:w-32 bg-transparent outline-none text-[10px] text-slate-500 ${main.isConfirmed ? '' : ''}`}
                                    value={step.equipment || ''}
                                    onChange={(e) => updateWorkplaceStepField(mIdx, sIdx, si, 'equipment', e.target.value)}
                                    placeholder="เครื่องมือ/อุปกรณ์"
                                    readOnly={main.isConfirmed}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                                  K{step.levels?.k} S{step.levels?.s} A{step.levels?.a}
                                </span>
                                {!main.isConfirmed && (
                                  <>
                                    <button type="button" onClick={() => analyzeSingleWorkplaceStep(mIdx, sIdx, si)} disabled={step.isAnalyzing || !step.step_text} className="text-blue-400 hover:text-blue-600 disabled:text-slate-200 ml-1" title="วิเคราะห์จุดประสงค์ขั้นตอนนี้">
                                      {step.isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                    </button>
                                    <button onClick={() => removeWorkplaceStep(mIdx, sIdx, si)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity ml-1"><X size={12} /></button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          {!main.isConfirmed && (
                            <button onClick={() => addWorkplaceStepLocal(mIdx, sIdx)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-2 py-1"><Plus size={12} /> เพิ่มขั้นตอนใหม่</button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Footer ของงานหลัก */}
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        {!main.isConfirmed && (
                          <button onClick={() => addWorkplaceSubtaskLocal(mIdx)} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md transition"><Plus size={14} /> เพิ่มงานย่อยแมนนวล</button>
                        )}
                      </div>
                      <button onClick={() => toggleConfirmWorkplaceTask(mIdx)} className={`px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-2 ${main.isConfirmed ? 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}>
                        {main.isConfirmed ? <><Settings size={14} /> ปลดล็อกแก้ไข</> : <><CheckCircle2 size={14} /> ยืนยันข้อมูลกลุ่มงานนี้</>}
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-blue-600" size={20} /> พิมพ์เอกสารแผนการฝึก</h3>
                  <p className="text-xs text-slate-500 mt-1">เลือกประเภทเอกสารที่ต้องการดูตัวอย่างและดาวน์โหลด</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setShowDownloadConfirm(activeReportView)} className="flex-1 md:flex-none bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-all"><FileDown size={14} /> โหลดหน้านี้</button>
                  <button onClick={() => setShowDownloadConfirm('reports')} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-all"><FileDown size={14} /> โหลดทั้งหมด</button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-6">
                {/* ซ่อนปุ่ม 04-02 ถึง 04-04 เพราะไม่มีข้อมูลรายวิชาแล้ว แต่ยังมีอยู่เผื่อการโหลดไฟล์เก่าที่มีข้อมูลรายวิชา */}
                {subjects.length > 0 && subjects.filter(s => s.isAnalyzed).length > 0 && (
                  <>
                    <button onClick={() => setActiveReportView('dve0402')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeReportView === 'dve0402' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>DVE-04-02</button>
                    <button onClick={() => setActiveReportView('dve0403')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeReportView === 'dve0403' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>DVE-04-03</button>
                    <button onClick={() => setActiveReportView('dve0404')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeReportView === 'dve0404' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>DVE-04-04</button>
                  </>
                )}
                <button onClick={() => setActiveReportView('dve0405')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeReportView === 'dve0405' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>ฝอ.1 (แผนฝึกตลอดหลักสูตร)</button>
                <button onClick={() => setActiveReportView('dve0406')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeReportView === 'dve0406' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>ฝอ.2 (แผนฝึกรายหน่วย)</button>
              </div>

              {/* กระดาษพรีวิว (ใช้ฟอนต์ Serif ด้านในนี้เท่านั้น) */}
              <div className="bg-slate-200 p-4 md:p-8 rounded-lg overflow-x-auto">
                <div id="dve-all-area" className="bg-white shadow-xl mx-auto font-serif text-[11pt] text-black">

                  {/* DVE-04-02 (เก็บไว้รองรับไฟล์เก่า) */}
                  <div id="dve-0402-area" className={`Section2 ${activeReportView !== 'dve0402' ? 'hidden' : ''}`}>
                    {subjects.filter(s => s.isAnalyzed).map((sub, idx) => {
                      let totalSubTasks = 0;
                      const mainTaskRows = [];
                      (sub.mainTasks || []).forEach(mt => {
                        const subs = mt.subTasks || [];
                        const subCount = subs.length > 0 ? subs.length : 1;
                        totalSubTasks += subCount;
                        mainTaskRows.push({ ...mt, rowSpan: subCount, subTasksList: subs.length > 0 ? subs : [{ id: '', name: '-' }] });
                      });
                      if (totalSubTasks === 0) totalSubTasks = 1;

                      return (
                        <div key={`dve0402-${sub.id}`} className="page-break font-serif p-12">
                          <div className="text-right text-[10pt] mb-1 border-2 border-black p-1 px-3 w-fit ml-auto font-bold">DVE-04-02</div>
                          <div className="text-center mb-6 font-serif">
                            <h2 className="text-[14pt] font-bold mb-3">ตารางวิเคราะห์งานจากรายวิชา</h2>
                            <div className="text-[11pt] space-y-1">
                              <p>รหัสวิชา {sub.code || '................'} ชื่อวิชา {sub.name || '..................................................'}</p>
                            </div>
                          </div>
                          <table className="w-full text-[10pt] border-collapse border-2 border-black font-serif">
                            <thead>
                              <tr className="bg-gray-100 font-bold text-center">
                                <th className="border border-black p-2" colSpan="3">หลักสูตรสถานศึกษา</th>
                                <th className="border border-black p-2" colSpan="3">วิเคราะห์งานจากรายวิชาในหลักสูตร</th>
                              </tr>
                              <tr className="bg-gray-50 font-bold text-center">
                                <th className="border border-black p-2 w-16">ท-ป-น</th>
                                <th className="border border-black p-2 w-1/5">สมรรถนะรายวิชา</th>
                                <th className="border border-black p-2 w-1/5">คำอธิบายรายวิชา</th>
                                <th className="border border-black p-2 w-1/6">อาชีพ/ตำแหน่งงาน</th>
                                <th className="border border-black p-2 w-1/5">งานหลัก</th>
                                <th className="border border-black p-2 w-1/5">งานย่อย</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mainTaskRows.length > 0 ? mainTaskRows.map((mt, mtIdx) => (
                                mt.subTasksList.map((st, stIdx) => (
                                  <tr key={`${mtIdx}-${stIdx}`} className="align-top">
                                    {mtIdx === 0 && stIdx === 0 && (
                                      <>
                                        <td rowSpan={totalSubTasks} className="border border-black p-2 text-center align-top">{sub.credits || '-'}</td>
                                        <td rowSpan={totalSubTasks} className="border border-black p-2 align-top whitespace-pre-line leading-relaxed">{sub.competencies || '-'}</td>
                                        <td rowSpan={totalSubTasks} className="border border-black p-2 align-top whitespace-pre-line leading-relaxed">{sub.isAnalyzed ? (sub.description && sub.description !== sub.competencies ? sub.description : '-') : (sub.description || '-')}</td>
                                        <td rowSpan={totalSubTasks} className="border border-black p-2 align-top">{sub.id} {config.occupation || 'ช่างเทคนิค'}</td>
                                      </>
                                    )}
                                    {stIdx === 0 && (
                                      <td rowSpan={mt.rowSpan} className="border border-black p-2 align-top">{mt.id} {cleanTaskName(mt.name)}</td>
                                    )}
                                    <td className="border border-black p-2 align-top">{st.id} {cleanTaskName(st.name)}</td>
                                  </tr>
                                ))
                              )) : (
                                <tr><td colSpan="6" className="border border-black p-4 text-center text-gray-500">ยังไม่มีข้อมูลการวิเคราะห์งาน</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* DVE-04-03 (เก็บไว้รองรับไฟล์เก่า) */}
                  <div id="dve-0403-area" className={`Section2 ${activeReportView !== 'dve0403' ? 'hidden' : ''}`}>
                    <div className="page-break font-serif p-12">
                      <div className="text-right text-[10pt] mb-1 border p-1 w-fit ml-auto italic">DVE-04-03</div>
                      <div className="text-center mb-8 font-serif font-bold">
                        <h2 className="text-[14pt] font-bold uppercase mb-4">แบบวิเคราะห์งานเทียบกับรายวิชาของผู้เรียนระบบทวิภาคี</h2>
                        <div className="text-[11pt] space-y-1 font-serif text-left">
                          <p>สถานประกอบการ: {config.companyName || '................'}</p>
                          <p>ปีการศึกษา {config.academicYear || '................'}</p>
                        </div>
                      </div>
                      <div className="bg-gray-100 border-2 border-black border-b-0 p-2 text-center font-bold uppercase font-serif">๑. รายการงานที่สอดคล้องและจัดฝึกปฏิบัติจริงในสถานประกอบการ</div>

                      {(() => {
                        const leftList = [];
                        subjects.filter(s => s.isAnalyzed).forEach(sub => {
                          leftList.push({ level: 0, text: `${sub.id} ${sub.name}` });
                          (sub.mainTasks || []).forEach(mt => {
                            leftList.push({ level: 1, text: `${mt.id} ${cleanTaskName(mt.name)}` });
                            (mt.subTasks || []).forEach(st => {
                              leftList.push({ level: 2, text: `${st.id} ${cleanTaskName(st.name)}` });
                            });
                          });
                        });

                        const rightList = [];
                        workplaceMainTasks.forEach((mt, mIdx) => {
                          rightList.push({ level: 0, text: `${mIdx + 1}. ${cleanTaskName(mt.name)}` });
                          (mt.subTasks || []).forEach((st, sIdx) => {
                            rightList.push({
                              level: 1,
                              text: `${mIdx + 1}.${sIdx + 1} ${cleanTaskName(st.workplaceName)}`,
                              hours: st.hours,
                              mappedSubjectId: st.id
                            });
                          });
                        });

                        const maxRows = Math.max(leftList.length, rightList.length);
                        const activeSubjects = subjects.filter(s => s.isAnalyzed);

                        return (
                          <table className="w-full text-[10pt] border-collapse border-2 border-black font-serif">
                            <thead>
                              <tr className="bg-gray-50 font-bold text-center font-serif">
                                <th className="border border-black p-2 w-[35%] align-middle">งานจากรายวิชา</th>
                                <th className="border border-black p-2 w-[35%] align-middle">งานในสถานประกอบการ</th>
                                <th className="border border-black p-2 text-center w-12 p-0 align-middle">
                                  <div className="vertical-text mx-auto text-[9pt]">เวลาฝึก (ชั่วโมง)</div>
                                </th>
                                {activeSubjects.map((s, i) => (
                                  <th key={s.id} className="border border-black p-2 font-bold w-12 p-0 align-bottom">
                                    <div className="vertical-text mx-auto text-[9pt]">{s.code || s.id} - {s.name}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRows }).map((_, i) => {
                                const left = leftList[i];
                                const right = rightList[i];
                                return (
                                  <tr key={i} className="font-serif align-top">
                                    <td className="border border-black p-1 px-3">
                                      {left && (
                                        <div className={`${left.level === 0 ? 'font-bold' : ''} ${left.level === 1 ? 'ml-4 font-semibold' : ''} ${left.level === 2 ? 'ml-8 text-gray-700' : ''}`}>
                                          {left.text}
                                        </div>
                                      )}
                                    </td>
                                    <td className="border border-black p-1 px-3">
                                      {right && (
                                        <div className={`${right.level === 0 ? 'font-bold' : 'ml-4 text-gray-700'}`}>
                                          {right.text}
                                        </div>
                                      )}
                                    </td>
                                    <td className="border border-black p-1 text-center font-bold">
                                      {right?.hours || ''}
                                    </td>
                                    {activeSubjects.map(s => {
                                    const matchedIds = right && right.mappedSubjectId
                                      ? String(right.mappedSubjectId).split(',').map(id => id.trim()).filter(id => id.toUpperCase().startsWith(s.id.toUpperCase()))
                                      : [];
                                    return (
                                      <td key={s.id} className="border border-black p-1 text-center font-black">
                                        {matchedIds.length > 0 ? matchedIds.join(', ') : ''}
                                      </td>
                                    );
                                  })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        );
                      })()}

                      <div className="bg-gray-100 border-2 border-black border-t-0 p-2 text-center font-bold uppercase font-serif mt-6">๒. งานที่ไม่ได้จัดฝึกเนื่องจากไม่ตรงกับงานในสถานประกอบการ</div>
                      <table className="w-full text-[10pt] border-collapse border-2 border-black font-serif">
                        <thead><tr className="bg-gray-50 font-bold text-center font-serif"><th className="border border-black p-2">งานรายวิชา</th><th className="border border-black p-2">งานหลักรายวิชา</th><th className="border border-black p-2 w-24">วิชา</th></tr></thead>
                        <tbody>
                          {unmappedTasks.map((st, i) => (
                            <tr key={i} className="italic text-[9pt] font-serif">
                              <td className="border border-black p-2 pl-8">{st.id} {st.name}</td>
                              <td className="border border-black p-2">{st.mainTaskName}</td>
                              <td className="border border-black p-2 text-center">{st.subjectId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DVE-04-04 (เก็บไว้รองรับไฟล์เก่า) */}
                  <div id="dve-0404-area" className={activeReportView !== 'dve0404' ? 'hidden' : ''}>
                    {subjects.filter(s => s.isAnalyzed).map((sub, idx) => (
                      <div key={`dve0404-${sub.id}`} className="page-break font-serif p-12">
                        <div className="text-right mb-2">
                          <span className="border border-black p-1 px-3 font-bold text-[12pt]">DVE-04-04</span>
                        </div>
                        <div className="text-center font-bold mb-6">
                          <h2 className="text-[16pt] mb-2 uppercase">รายวิชาที่นำไปฝึกในสถานประกอบการ</h2>
                          <p className="text-[14pt]">
                            รหัสวิชา {sub.code || '................'} ชื่อวิชา {sub.name || '................................'} ท-ป-น {sub.credits || '........'}
                          </p>
                        </div>

                        <div className="space-y-4 text-[12pt] leading-relaxed text-left">
                          <div>
                            <p className="font-bold inline-block border border-black p-1 bg-gray-100">อ้างอิงมาตรฐาน</p>
                            <div className="pl-6 mt-1 whitespace-pre-line">{sub.standards || '................................................................................................\n................................................................................................'}</div>
                          </div>

                          <div>
                            <p className="font-bold inline-block border border-black p-1 bg-gray-100">ผลลัพธ์การเรียนรู้ระดับรายวิชา</p>
                            <div className="pl-6 mt-1 whitespace-pre-line">{sub.learningOutcomes || '................................................................................................\n................................................................................................'}</div>
                          </div>

                          <div>
                            <p className="font-bold inline-block border border-black p-1 bg-gray-100">จุดประสงค์รายวิชา</p>
                            <div className="pl-6 mt-1 whitespace-pre-line">{sub.objectives || '................................................................................................\n................................................................................................'}</div>
                          </div>

                          <div>
                            <p className="font-bold inline-block border border-black p-1 bg-gray-100">สมรรถนะรายวิชา</p>
                            <div className="pl-6 mt-1 whitespace-pre-line">{sub.competencies || '................................................................................................\n................................................................................................'}</div>
                          </div>

                          <div>
                            <p className="font-bold inline-block border border-black p-1 bg-gray-100">คำอธิบายรายวิชา</p>
                            <div className="pl-6 mt-1 whitespace-pre-line">{sub.description || '................................................................................................\n................................................................................................'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ฝอ.1 */}
                  <div id="dve-0405-area" className={activeReportView !== 'dve0405' ? 'hidden' : ''}>
                    <div className="page-break font-serif p-12">
                      <div className="text-right text-[10pt] mb-4 font-serif">
                        <span className="border border-black p-1 font-bold">DVE-04-05 (ฝอ.1)</span>
                      </div>
                      <div className="report-header font-serif text-[11pt] space-y-1.5 mb-6">
                        <h2 className="text-center font-bold text-[16pt] mb-2 uppercase font-serif">การวิเคราะห์งานในสถานประกอบการ</h2>
                        <h3 className="text-center font-bold text-[14pt] mb-6">สถานประกอบการ {config.companyName || '................................................'}</h3>
                      </div>
                      <div className="font-bold text-[12pt] mb-3 font-serif">๑. รายการงานที่จัดฝึกปฏิบัติในสถานประกอบการ</div>
                      <table className="w-full border-collapse border-2 border-black mb-8 text-[11pt] font-serif">
                        <thead>
                          <tr className="bg-gray-100 font-bold text-center font-serif">
                            <th className="border border-black p-2">อาชีพ / ตำแหน่งงาน</th>
                            <th className="border border-black p-2">งานหลักในสถานประกอบการ</th>
                            <th className="border border-black p-2">งานย่อยในสถานประกอบการ</th>
                            <th className="border border-black p-2">ชื่อ-สกุล ครูฝึก</th>
                            <th className="border border-black p-2 w-24">เวลาฝึก (ชม.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workplaceTasksFlat.map((t, i) => (
                            <tr key={i} className="font-serif align-top">
                              <td className="border border-black p-2 text-center">{config.occupation || '-'}</td>
                              <td className="border border-black p-2">{cleanTaskName(t.parentMainTaskName)}</td>
                              <td className="border border-black p-2 font-bold">{cleanTaskName(t.workplaceName)}</td>
                              <td className="border border-black p-2 text-center">{config.trainerName || '-'}</td>
                              <td className="border border-black p-2 text-center font-bold">{t.hours}</td>
                            </tr>
                          ))}
                          {workplaceTasksFlat.length === 0 && (
                            <tr><td colSpan="5" className="border border-black p-4 text-center text-gray-400 italic">กรุณาเพิ่มข้อมูลงานในแท็บ "วิเคราะห์งาน"</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ฝอ.2 */}
                  <div id="dve-0406-area" className={activeReportView !== 'dve0406' ? 'hidden' : ''}>
                    <div className="font-serif">
                      {workplaceTasksFlat.map((task, idx) => (
                        <div key={idx} className="page-break p-12">
                          <div className="text-right text-[10pt] mb-4 font-serif">
                            <span className="border border-black p-1 font-bold">DVE-04-06 (ฝอ.๒)</span>
                          </div>

                          <div className="report-header font-serif text-[11pt] space-y-1.5 mb-6">
                            <h2 className="text-center font-black text-[16pt] mb-6 uppercase font-serif">แผนการฝึกอาชีพรายหน่วยสถานประกอบการ {config.companyName || '................................'}</h2>
                            <p>อาชีพ /ตำแหน่งงาน <span className="underline decoration-dotted">{config.occupation || '................................'}</span> ส่วนงาน/จุดที่ฝึกงาน <span className="underline decoration-dotted">{config.department || '................................'}</span></p>
                            <p className="mt-4 font-bold font-serif text-[12pt]">งานหลัก {task.mainTaskIndex}. {cleanTaskName(task.parentMainTaskName) || '................................'}</p>
                            <p className="font-bold font-serif text-[12pt]">งานย่อย {task.subTaskIndex}. {cleanTaskName(task.workplaceName) || '................................'} <span className="font-normal">(เวลาฝึก: {task.hours} วัน/ชั่วโมง)</span></p>
                            <p>ชื่อ-สกุล ครูฝึก <span className="underline decoration-dotted">{config.trainerName || '................................'}</span> ตำแหน่ง <span className="underline decoration-dotted">{config.trainerPosition || '................................'}</span></p>
                          </div>

                          <table className="w-full text-[10pt] border-collapse border-2 border-black font-serif">
                            <thead>
                              <tr className="bg-gray-100 font-bold text-center font-serif">
                                <th className="border border-black p-1 w-8" rowSpan="2">ที่</th>
                                <th className="border border-black p-1 w-1/4" rowSpan="2">ขั้นตอนการปฏิบัติงาน</th>
                                <th className="border border-black p-1 w-1/4" rowSpan="2">จุดประสงค์เชิงพฤติกรรม</th>
                                <th className="border border-black p-1" colSpan="4">ระดับความสามารถที่ต้องการ</th>
                                <th className="border border-black p-1" rowSpan="2">วิธีสอน</th>
                                <th className="border border-black p-1" rowSpan="2">สื่อ / อุปกรณ์</th>
                                <th className="border border-black p-1" rowSpan="2">การประเมิน</th>
                              </tr>
                              <tr className="bg-gray-50 font-bold text-center text-[8pt] font-serif">
                                <th className="border border-black w-8">K</th>
                                <th className="border border-black w-8">S</th>
                                <th className="border border-black w-8">A</th>
                                <th className="border border-black w-8">Ap</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(task.detailed_steps || []).map((step, si) => (
                                <tr key={si} className="align-top leading-tight font-serif">
                                  <td className="border border-black p-2 text-center font-bold">{si + 1}</td>
                                  <td className="border border-black p-2 font-bold leading-relaxed">{step.step_text}</td>
                                  <td className="border border-black p-2 space-y-1 text-[9pt] font-serif">
                                    <p><b>K:</b> {step.objectives?.k || '-'}</p>
                                    <p><b>S:</b> {step.objectives?.s || '-'}</p>
                                    <p><b>A:</b> {step.objectives?.a || '-'}</p>
                                    <p><b>Ap:</b> {step.objectives?.ap || '-'}</p>
                                  </td>
                                  <td className="border border-black p-2 text-center font-bold">K{step.levels?.k || 1}</td>
                                  <td className="border border-black p-2 text-center font-bold">S{step.levels?.s || 1}</td>
                                  <td className="border border-black p-2 text-center font-bold">A{step.levels?.a || 1}</td>
                                  <td className="border border-black p-2 text-center font-bold">Ap{step.levels?.ap || 1}</td>
                                  <td className="border border-black p-2 text-[9pt] text-center">สาธิต/ปฏิบัติ</td>
                                  <td className="border border-black p-2 text-[9pt] text-left leading-relaxed">{step.equipment || 'ของจริง / คู่มือ'}</td>
                                  <td className="border border-black p-2 text-[9pt] text-center">สังเกตพฤติกรรม</td>
                                </tr>
                              ))}
                              {(!task.detailed_steps || task.detailed_steps.length === 0) && (
                                 <tr><td colSpan="10" className="border border-black p-4 text-center text-gray-400 italic">ไม่มีข้อมูลขั้นตอนการทำงาน</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ))}
                      {workplaceTasksFlat.length === 0 && (
                        <div className="p-12 text-center text-gray-400 italic font-serif border border-dashed border-gray-300">
                          กรุณาเพิ่มข้อมูลงานในแท็บ "วิเคราะห์งาน" ก่อนแสดงรายงาน
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* EVALUATIONS TAB */}
        {activeTab === 'evaluation' && (
          <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck className="text-blue-600" size={20} /> พิมพ์แบบประเมินและสรุปผล</h3>
                  <p className="text-xs text-slate-500 mt-1">เลือกประเภทการประเมินและตั้งค่ารูปแบบ</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setShowDownloadConfirm(activeEvalView)} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-all"><FileDown size={14} /> ดาวน์โหลดเอกสารนี้</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-6">
                <button onClick={() => setActiveEvalView('eval_workplace')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeEvalView === 'eval_workplace' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><FileSearch size={14} className="inline mr-1" /> ประเมินปฏิบัติงาน (ย่อย)</button>
                {/* ซ่อนปุ่มการประเมิน 2 และ 3 ถ้าไม่มีข้อมูลวิชา (แต่คงไว้รองรับไฟล์เดิม) */}
                {subjects.length > 0 && subjects.filter(s => s.isAnalyzed).length > 0 && (
                  <>
                    <button onClick={() => setActiveEvalView('eval_supervision')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeEvalView === 'eval_supervision' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><FileSearch size={14} className="inline mr-1" /> นิเทศติดตาม (วิชา)</button>
                    <button onClick={() => setActiveEvalView('dve1102')} className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeEvalView === 'dve1102' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><FileSearch size={14} className="inline mr-1" /> สรุป DVE-11-02</button>
                  </>
                )}
              </div>

              <input type="file" accept=".jobcompany" ref={evalFileInputRef} onChange={handleFileUploadLocal} className="hidden" />

              {/* การตั้งค่าแบบประเมิน */}
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Settings size={16} className="text-blue-500" /> ตั้งค่ารูปแบบการประเมิน</h4>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/3">
                    <label className="text-xs font-semibold text-slate-600 block mb-2">รูปแบบมาตราส่วน (Rating Scale)</label>
                    <div className="space-y-2.5">
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-md -ml-1.5 transition-colors">
                        <input type="radio" name="evalType" checked={evalFormType === 'checklist'} onChange={() => setEvalFormType('checklist')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="text-xs text-slate-700 font-medium">แบบเช็คลิสต์ (ทำได้ / ทำไม่ได้)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-md -ml-1.5 transition-colors">
                        <input type="radio" name="evalType" checked={evalFormType === '5'} onChange={() => setEvalFormType('5')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="text-xs text-slate-700 font-medium">แบบประเมิน 5 ระดับ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-md -ml-1.5 transition-colors">
                        <input type="radio" name="evalType" checked={evalFormType === '4'} onChange={() => setEvalFormType('4')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="text-xs text-slate-700 font-medium">แบบประเมิน 4 ระดับ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-md -ml-1.5 transition-colors">
                        <input type="radio" name="evalType" checked={evalFormType === '3'} onChange={() => setEvalFormType('3')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="text-xs text-slate-700 font-medium">แบบประเมิน 3 ระดับ</span>
                      </label>
                    </div>
                  </div>
                  <div className="md:w-2/3">
                    <label className="text-xs font-semibold text-slate-600 block mb-2">เลือกรายการประเมิน ส่วนที่ 2 (ด้านกิจนิสัย)</label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 border border-slate-200 bg-white p-3 rounded-md">
                      {BEHAVIOR_OPTIONS.map(beh => (
                        <label key={beh} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedBehaviors.includes(beh)}
                            onChange={() => handleBehaviorToggle(beh)}
                            className="text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-700">{beh}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* กระดาษพรีวิว */}
              <div className="bg-slate-200 p-4 md:p-8 rounded-lg overflow-x-auto">
                <div className="w-full flex justify-center mb-4">
                  <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded shadow-sm">พรีวิวเอกสาร</span>
                </div>

                <div className="bg-white shadow-xl mx-auto font-serif text-[11pt] text-black">
                  {/* แบบประเมินปฏิบัติงานเดิม (รายงานย่อย K,S,A,Ap) */}
                  {activeEvalView === 'eval_workplace' && (
                    <div id="dve-eval-workplace-area" className="font-serif">
                      {workplaceTasksFlat.map((task, idx) => {
                        const kItems = task.detailed_steps?.map(s => s.objectives?.k).filter(i => i && i.trim() !== '' && i.trim() !== '-') || [];
                        const sItems = task.detailed_steps?.map(s => s.objectives?.s).filter(i => i && i.trim() !== '' && i.trim() !== '-') || [];
                        const aItems = task.detailed_steps?.map(s => s.objectives?.a).filter(i => i && i.trim() !== '' && i.trim() !== '-') || [];
                        const apItems = task.detailed_steps?.map(s => s.objectives?.ap).filter(i => i && i.trim() !== '' && i.trim() !== '-') || [];

                        const renderEvalCategoryRows = (title, items) => {
                          if (items.length === 0) return null;

                          let colCount = 4; // checklist: item, yes, no, comment
                          if (evalFormType === '5') colCount = 7;
                          if (evalFormType === '4') colCount = 6;
                          if (evalFormType === '3') colCount = 5;

                          return (
                            <>
                              <tr className="bg-gray-100 font-bold">
                                <td colSpan={colCount} className="border border-black p-2 pl-4">{title}</td>
                              </tr>
                              {items.map((item, i) => (
                                <tr key={i} className="align-top">
                                  <td className="border border-black p-2 pl-4 text-left">{i + 1}. {item}</td>
                                  {evalFormType === 'checklist' && (
                                    <>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                    </>
                                  )}
                                  {evalFormType === '5' && (
                                    <>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                    </>
                                  )}
                                  {evalFormType === '4' && (
                                    <>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                    </>
                                  )}
                                  {evalFormType === '3' && (
                                    <>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                      <td className="border border-black p-2"></td>
                                    </>
                                  )}
                                  <td className="border border-black p-2"></td>
                                </tr>
                              ))}
                            </>
                          );
                        };

                        return (
                          <div key={`eval-wp-${idx}`} className="page-break p-12 font-serif">
                            <div className="text-right text-[10pt] mb-2 font-bold font-serif border border-black p-1 w-fit ml-auto">แบบประเมินปฏิบัติงาน</div>
                            <div className="text-center font-bold mb-6">
                              <h2 className="text-[16pt] uppercase mb-2">แบบประเมินการปฏิบัติงานในสถานประกอบการ</h2>
                            </div>

                            <div className="text-[12pt] mb-6 space-y-1">
                              <p><b>ชื่อนักเรียน:</b> ........................................................................................................ </p>
                              <p><b>สถานประกอบการ:</b> {config.companyName || '....................................................................'} <b>อาชีพที่ฝึก:</b> {config.occupation || '....................................................................'}</p>
                              <p><b>งานหลัก:</b> {task.mainTaskIndex}. {cleanTaskName(task.parentMainTaskName) || '........................................................................................'}</p>
                              <p><b>งานย่อยที่ปฏิบัติ:</b> {task.subTaskIndex}. {cleanTaskName(task.workplaceName) || '........................................................................................'}</p>
                            </div>

                            <table className="w-full text-[11pt] border-collapse border-2 border-black font-serif mb-4">
                              <thead>
                                <tr className="bg-gray-100 font-bold text-center">
                                  <th className="border border-black p-2 w-[40%] align-middle text-left">รายการประเมิน (จุดประสงค์การปฏิบัติงาน)</th>
                                  {evalFormType === 'checklist' && (
                                    <>
                                      <th className="border border-black p-2 w-20 align-middle">ทำได้</th>
                                      <th className="border border-black p-2 w-20 align-middle">ทำไม่ได้</th>
                                    </>
                                  )}
                                  {evalFormType === '5' && (
                                    <>
                                      <th className="border border-black p-2 w-12 align-middle">5</th>
                                      <th className="border border-black p-2 w-12 align-middle">4</th>
                                      <th className="border border-black p-2 w-12 align-middle">3</th>
                                      <th className="border border-black p-2 w-12 align-middle">2</th>
                                      <th className="border border-black p-2 w-12 align-middle">1</th>
                                    </>
                                  )}
                                  {evalFormType === '4' && (
                                    <>
                                      <th className="border border-black p-2 w-12 align-middle">4</th>
                                      <th className="border border-black p-2 w-12 align-middle">3</th>
                                      <th className="border border-black p-2 w-12 align-middle">2</th>
                                      <th className="border border-black p-2 w-12 align-middle">1</th>
                                    </>
                                  )}
                                  {evalFormType === '3' && (
                                    <>
                                      <th className="border border-black p-2 w-12 align-middle">3</th>
                                      <th className="border border-black p-2 w-12 align-middle">2</th>
                                      <th className="border border-black p-2 w-12 align-middle">1</th>
                                    </>
                                  )}
                                  <th className="border border-black p-2 align-middle">ข้อเสนอแนะ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {renderEvalCategoryRows('ด้านพุทธิพิสัย (Knowledge)', kItems)}
                                {renderEvalCategoryRows('ด้านทักษะพิสัย (Skill)', sItems)}
                                {renderEvalCategoryRows('ด้านจิตพิสัย (Attitude)', aItems)}
                                {renderEvalCategoryRows('ด้านการประยุกต์ใช้ (Application)', apItems)}
                              </tbody>
                            </table>

                            {/* Rubric Section */}
                            <div className="mb-8 text-[11pt] leading-relaxed">
                              <b>เกณฑ์การให้คะแนน (Rubric):</b><br />
                              {evalFormType === '5' && "5 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 4 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 3 = ปฏิบัติได้ปานกลาง/ต้องได้รับคำแนะนำบ้าง, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                              {evalFormType === '4' && "4 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 3 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                              {evalFormType === '3' && "3 = ปฏิบัติได้ดี/ถูกต้องสมบูรณ์, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                              {evalFormType === 'checklist' && "ทำได้ = สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน, ทำไม่ได้ = ไม่สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน"}
                            </div>

                            <div className="flex justify-between mt-12 text-[12pt] px-10">
                              <div className="text-center">
                                <p className="mb-6">ลงชื่อ..................................................................</p>
                                <p>(..............................................................)</p>
                                <p>ผู้รับการประเมิน (นักเรียน)</p>
                              </div>
                              <div className="text-center">
                                <p className="mb-6">ลงชื่อ..................................................................</p>
                                <p>({config.trainerName || '..............................................................'})</p>
                                <p>ผู้ประเมิน (ครูฝึกในสถานประกอบการ)</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {workplaceTasksFlat.length === 0 && (
                        <div className="p-12 text-center text-gray-400 italic font-serif border border-dashed border-gray-300">
                          กรุณาเพิ่มข้อมูลงานในแท็บ "วิเคราะห์งาน" ก่อนแสดงรายงาน
                        </div>
                      )}
                    </div>
                  )}

                  {/* พื้นที่สำหรับสร้างเอกสาร แบบนิเทศติดตามประเมินผล (ตามรายวิชา) - รองรับข้อมูลเก่า */}
                  {activeEvalView === 'eval_supervision' && (
                    <div id="dve-supervision-area" className="font-serif">
                      {subjects.filter(s => s.isAnalyzed).map(sub => {
                        const allSubTasks = sub.mainTasks?.flatMap(mt => mt.subTasks || []) || [];
                        const mappedTasksForThisSubject = allSubTasks.filter(st => workplaceTasksFlat.some(wt => wt.id === st.id));

                        let colCount = 4; // checklist
                        if (evalFormType === '5') colCount = 7;
                        if (evalFormType === '4') colCount = 6;
                        if (evalFormType === '3') colCount = 5;

                        return (
                          <div key={`supervision-${sub.id}`} className="page-break p-12 font-serif">
                            <div className="text-center font-bold mb-6">
                              <h2 className="text-[16pt] mb-2">แบบนิเทศติดตามประเมินผลการฝึกอาชีพ</h2>
                              <p className="text-[14pt] font-normal">ระหว่างวิทยาลัย....................................................... กับบริษัท {config.companyName || '.......................................................'}</p>
                              <p className="text-[14pt] font-normal">รหัสวิชา {sub.code || '.........................'} รายวิชา {sub.name || '..................................................................'}</p>
                              <p className="text-[14pt] font-normal">ประจำเดือน.......................................................</p>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '15px', fontSize: '12pt' }}>
                              <tbody>
                                <tr>
                                  <td style={{ width: '50%', border: '1px solid black', padding: '10px', verticalAlign: 'top', lineHeight: '1.8' }}>
                                    ชื่อ....................................................... นามสกุล...................................................<br />
                                    ภาคเรียนที่................................... ปีการศึกษา {config.academicYear || '....................................'}<br />
                                    ฝึกอาชีพระหว่างวันที่...................... เดือน............................................. พ.ศ. .........<br />
                                    ถึงวันที่...................... เดือน............................................. พ.ศ. .........<br />
                                  </td>
                                  <td style={{ width: '50%', border: '1px solid black', padding: '10px', verticalAlign: 'top', lineHeight: '1.8' }}>
                                    สถิติการฝึกอาชีพ<br />
                                    ระยะเวลาที่ประเมินตั้งแต่ วันที่........... เดือน................................... พ.ศ. .........<br />
                                    ถึงวันที่........... เดือน................................... พ.ศ. .........<br />
                                    <div className="flex justify-between pr-4 md:pr-12">
                                      <span>(  ) สาย...................ครั้ง</span>
                                      <span>(  ) ขาดงาน...........วัน</span>
                                    </div>
                                    <div className="flex justify-between pr-4 md:pr-12">
                                      <span>(  ) ลาป่วย...........วัน</span>
                                      <span>(  ) ลากิจ...........วัน</span>
                                    </div>
                                    วันที่ประเมิน.....................................................................................
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            <p className="mb-2 font-bold text-[12pt]">คำชี้แจง โปรดทำเครื่องหมาย ✓ลงในช่องที่เห็นว่าตรงกับความเป็นจริงมากที่สุด</p>

                            <table className="w-full text-[11pt] border-collapse border-2 border-black font-serif mb-4">
                              <thead>
                                <tr className="bg-gray-100 font-bold text-center">
                                  <th className="border border-black p-2 w-[40%] align-middle text-center">หัวข้อประเมิน</th>
                                  {evalFormType === 'checklist' && (
                                    <>
                                      <th className="border border-black p-2 w-20 align-middle">ทำได้</th>
                                      <th className="border border-black p-2 w-20 align-middle">ทำไม่ได้</th>
                                    </>
                                  )}
                                  {evalFormType === '5' && (
                                    <>
                                      <th className="border border-black p-2 w-12 align-middle">5</th>
                                      <th className="border border-black p-2 w-12 align-middle">4</th>
                                      <th className="border border-black p-2 w-12 align-middle">3</th>
                                      <th className="border border-black p-2 w-12 align-middle">2</th>
                                      <th className="border border-black p-2 w-12 align-middle">1</th>
                                    </>
                                  )}
                                  {evalFormType === '4' && (
                                    <>
                                      <th className="border border-black p-2 w-12 align-middle">4</th>
                                      <th className="border border-black p-2 w-12 align-middle">3</th>
                                      <th className="border border-black p-2 w-12 align-middle">2</th>
                                      <th className="border border-black p-2 w-12 align-middle">1</th>
                                    </>
                                  )}
                                  {evalFormType === '3' && (
                                    <>
                                      <th className="border border-black p-2 w-12 align-middle">3</th>
                                      <th className="border border-black p-2 w-12 align-middle">2</th>
                                      <th className="border border-black p-2 w-12 align-middle">1</th>
                                    </>
                                  )}
                                  <th className="border border-black p-2 align-middle">ข้อเสนอแนะ</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-gray-50 font-bold">
                                  <td colSpan={colCount} className="border border-black p-2 pl-4">ส่วนที่ 1 การปฏิบัติงาน</td>
                                </tr>
                                {mappedTasksForThisSubject.length > 0 ? mappedTasksForThisSubject.map((st, i) => (
                                  <tr key={i} className="align-top">
                                    <td className="border border-black p-2 pl-4 text-left">{st.id} {cleanTaskName(st.name)}</td>
                                    {Array.from({ length: colCount - 2 }).map((_, j) => <td key={j} className="border border-black p-2"></td>)}
                                    <td className="border border-black p-2"></td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan={colCount} className="border border-black p-2 text-center text-gray-500">ไม่มีงานย่อยที่สอดคล้องกับสถานประกอบการ</td>
                                  </tr>
                                )}

                                {selectedBehaviors.length > 0 && (
                                  <>
                                    <tr className="bg-gray-50 font-bold">
                                      <td colSpan={colCount} className="border border-black p-2 pl-4">ส่วนที่ 2 ด้านกิจนิสัย</td>
                                    </tr>
                                    {selectedBehaviors.map((beh, i) => (
                                      <tr key={`beh-${i}`} className="align-top">
                                        <td className="border border-black p-2 pl-4 text-left">{i + 1}. {beh}</td>
                                        {Array.from({ length: colCount - 2 }).map((_, j) => <td key={j} className="border border-black p-2"></td>)}
                                        <td className="border border-black p-2"></td>
                                      </tr>
                                    ))}
                                  </>
                                )}
                              </tbody>
                            </table>

                            {/* Rubric Section */}
                            <div className="mb-6 text-[11pt] leading-relaxed">
                              <b>เกณฑ์การให้คะแนน (Rubric):</b><br />
                              {evalFormType === '5' && "5 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 4 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 3 = ปฏิบัติได้ปานกลาง/ต้องได้รับคำแนะนำบ้าง, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                              {evalFormType === '4' && "4 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 3 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                              {evalFormType === '3' && "3 = ปฏิบัติได้ดี/ถูกต้องสมบูรณ์, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                              {evalFormType === 'checklist' && "ทำได้ = สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน, ทำไม่ได้ = ไม่สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน"}
                            </div>

                            <div className="mb-8 text-[12pt]">
                              <p>ความคิดเห็นเพิ่มเติม/ข้อเสนอแนะ..........................................................................................................................................</p>
                              <p>.......................................................................................................................................................................................</p>
                            </div>

                            <div className="flex justify-between mt-12 text-[12pt] px-10">
                              <div className="text-center">
                                <p className="mb-6">ลงชื่อ..................................................................</p>
                                <p>(..............................................................)</p>
                                <p>ผู้รับการประเมิน</p>
                              </div>
                              <div className="text-center">
                                <p className="mb-6">ลงชื่อ..................................................................</p>
                                <p>({config.trainerName || '..............................................................'})</p>
                                <p>ผู้ประเมิน</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* พื้นที่สำหรับสร้างเอกสาร DVE-11-02 (รองรับข้อมูลเก่า) */}
                  {activeEvalView === 'dve1102' && (
                    <div id="dve-11-02-area" className="font-serif">
                      {subjects.filter(s => s.isAnalyzed).map(sub => {
                        const mappedTasksForThisSubject = workplaceTasksFlat.filter(wt => {
                          let isMatched = false;
                          if (wt.id) {
                            const ids = String(wt.id).split(',').map(id => id.trim().toUpperCase());
                            if (ids.some(id => id.startsWith(sub.id.toUpperCase()))) isMatched = true;
                          }
                          if (!isMatched && wt.detailed_steps) {
                            wt.detailed_steps.forEach(step => {
                              if (step.subjectTaskId) {
                                const ids = String(step.subjectTaskId).split(',').map(id => id.trim().toUpperCase());
                                if (ids.some(id => id.startsWith(sub.id.toUpperCase()))) isMatched = true;
                              }
                            });
                          }
                          return isMatched;
                        });
                        const unmappedTasksForThisSubject = unmappedTasks.filter(st => st.subjectId === sub.id);

                        return (
                          <div key={`dve1102-${sub.id}`} className="page-break p-12 font-serif">
                            <div className="text-right text-[10pt] mb-1 font-bold font-serif border border-black p-1 w-fit ml-auto">DVE-11-02</div>
                            <div className="text-center font-bold mb-4">
                              <h2 className="text-[16pt] mb-2">แบบสรุปผลการเรียนรู้รายวิชา</h2>
                            </div>

                            <div className="text-[12pt] mb-4 leading-relaxed">
                              รหัสวิชา {sub.code || '................'} ชื่อวิชา {sub.name || '........................................................'} หน่วยกิต {sub.credits || '........'}<br />
                              <table className="w-full mt-2" style={{ border: 'none', marginBottom: '0' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ border: 'none', padding: '0', width: '60%' }}>ชื่อ-สกุล ..........................................................................................</td>
                                    <td style={{ border: 'none', padding: '0' }}>รหัสผู้เรียน ...........................................................</td>
                                  </tr>
                                </tbody>
                              </table>
                              ชื่อสถานประกอบการ {config.companyName || '............................................................................................................'}
                            </div>

                            <table className="w-full text-[11pt] border-collapse border border-black font-serif">
                              <thead>
                                <tr className="bg-gray-100 text-center font-bold">
                                  <th className="border border-black p-2 align-middle text-left" rowSpan="2" style={{ width: '40%' }}>รหัสงานย่อย</th>
                                  <th className="border border-black p-2 align-middle" colSpan="2" style={{ width: '12%' }}>จำนวน</th>
                                  <th className="border border-black p-2" colSpan="4">สถานประกอบการ (70%)</th>
                                  <th className="border border-black p-2" colSpan="2">ครูนิเทศก์ (30%)</th>
                                  <th className="border border-black p-2 align-middle bg-yellow-100" rowSpan="2" style={{ width: '8%' }}>รวม</th>
                                </tr>
                                <tr className="bg-gray-50 text-center font-bold text-[10pt]">
                                  <th className="border border-black p-1" colSpan="2">คะแนน</th>
                                  <th className="border border-black p-1 w-10">ครั้งที่ 1</th>
                                  <th className="border border-black p-1 w-10">ครั้งที่ 2</th>
                                  <th className="border border-black p-1 w-10">ครั้งที่ 3</th>
                                  <th className="border border-black p-1 w-14">ร้อยละ 70</th>
                                  <th className="border border-black p-1 w-12">คะแนน</th>
                                  <th className="border border-black p-1 w-14">ร้อยละ 30</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-gray-50">
                                  <td colSpan="10" className="border border-black p-2 font-bold">ส่วนที่ 1 การปฏิบัติงาน</td>
                                </tr>
                                {mappedTasksForThisSubject.length > 0 ? mappedTasksForThisSubject.map((t, idx) => (
                                  <tr key={idx}>
                                    <td className="border border-black p-2 pl-4 text-left">{t.id} {cleanTaskName(t.workplaceName)}</td>
                                    <td className="border border-black p-1 w-10"></td>
                                    <td className="border border-black p-1 text-center text-[10pt] align-middle text-gray-700">คะแนน</td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2 bg-blue-50/50"></td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2 bg-blue-50/50"></td>
                                    <td className="border border-black p-2"></td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td className="border border-black p-2 pl-6 text-gray-500 text-center" colSpan="10">ไม่มีงานย่อยที่สอดคล้องกับสถานประกอบการ</td>
                                  </tr>
                                )}
                                <tr className="bg-blue-100/30">
                                  <td colSpan="10" className="border border-black p-2 font-bold pl-6">ส่วนที่ 2 ด้านกิจนิสัย</td>
                                </tr>
                                {selectedBehaviors.length > 0 ? selectedBehaviors.map((beh, idx) => (
                                  <tr key={`dve1102-beh-${idx}`}>
                                    <td className="border border-black p-2 pl-4 text-left">{idx + 1}. {beh}</td>
                                    <td className="border border-black p-1 w-10"></td>
                                    <td className="border border-black p-1 text-center text-[10pt] align-middle text-gray-700">คะแนน</td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2 bg-blue-50/50"></td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2 bg-blue-50/50"></td>
                                    <td className="border border-black p-2"></td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td className="border border-black p-2 pl-6 text-gray-500 text-center" colSpan="10">ไม่ได้เลือกหัวข้อด้านกิจนิสัย</td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="border border-black p-2 font-bold text-center">รวมคะแนนฝึกในสถานประกอบการ</td>
                                  <td className="border border-black p-1"></td>
                                  <td className="border border-black p-1 text-center font-bold text-[10pt] align-middle text-gray-700">คะแนน</td>
                                  <td className="border border-black p-2"></td>
                                  <td className="border border-black p-2"></td>
                                  <td className="border border-black p-2"></td>
                                  <td className="border border-black p-2 bg-gray-200"></td>
                                  <td className="border border-black p-2 bg-gray-200"></td>
                                  <td className="border border-black p-2 bg-gray-200"></td>
                                  <td className="border border-black p-2 bg-yellow-200"></td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td colSpan="10" className="border border-black p-2 font-bold text-center">สมรรถนะที่จัดการเรียนการสอนเพิ่มเติม(ที่ไม่สอดคล้องกับงานในสถานประกอบการ)</td>
                                </tr>
                                {unmappedTasksForThisSubject.length > 0 ? unmappedTasksForThisSubject.map((ut, idx) => (
                                  <tr key={idx}>
                                    <td className="border border-black p-2 pl-4 text-left">{ut.id} {cleanTaskName(ut.name)}</td>
                                    <td className="border border-black p-1"></td>
                                    <td className="border border-black p-1 text-center text-[10pt] align-middle text-gray-700">คะแนน</td>
                                    <td colSpan="4" className="border border-black p-2 bg-gray-200"></td>
                                    <td colSpan="2" className="border border-black p-2"></td>
                                    <td className="border border-black p-2"></td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan="10" className="border border-black p-2 text-center text-gray-500">ไม่มี (สอนครอบคลุมทุกจุดประสงค์แล้ว)</td>
                                  </tr>
                                )}
                                <tr className="font-bold">
                                  <td className="border border-black p-2 text-center">รวมคะแนนเต็ม</td>
                                  <td colSpan="2" className="border border-black p-2 text-center">100<br /><span className="text-[10pt] font-normal text-gray-500">คะแนน</span></td>
                                  <td colSpan="6" className="border border-black p-2 text-center align-middle">รวมคะแนนทั้งรายวิชา</td>
                                  <td className="border border-black p-2"></td>
                                </tr>
                              </tbody>
                            </table>

                            <div className="mt-8 text-[12pt]">
                              <p>ความคิดเห็นเพิ่มเติม/ข้อเสนอแนะ..........................................................................................................................................</p>
                              <p>.......................................................................................................................................................................................</p>
                            </div>

                            <div className="flex justify-between mt-12 text-[12pt] px-10">
                              <div className="text-center">
                                <p className="mb-6">ลงชื่อ..................................................................</p>
                                <p>(..............................................................)</p>
                                <p>ผู้รับการประเมิน</p>
                              </div>
                              <div className="text-center">
                                <p className="mb-6">ลงชื่อ..................................................................</p>
                                <p>({config.trainerName || '..............................................................'})</p>
                                <p>ผู้ประเมิน</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-slate-500 text-xs py-8 mt-12 mb-20 lg:mb-8 font-medium">
        <p>© 2026 สุกฤษฏิ์พล โชติอรรฐพล. All Rights Reserved.</p>
        <button type="button" onClick={() => setShowTermsModal(true)} className="text-blue-600 hover:text-blue-800 mt-2 transition-colors cursor-pointer inline-block">ข้อตกลงและเงื่อนไข (Terms of Service)</button>
      </footer>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around z-50 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)]">
        {[
          { id: 'setup', l: 'ตั้งค่า', i: Settings },
          { id: 'workplace', l: 'วิเคราะห์งาน', i: Building2 },
          { id: 'reports', l: 'รายงาน', i: FileText },
          { id: 'evaluation', l: 'ประเมิน', i: ClipboardCheck },
        ].map(nav => (
          <button key={nav.id} onClick={() => setActiveTab(nav.id)} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === nav.id ? 'text-blue-600 bg-blue-50/50 border-t-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-t-2 border-transparent'}`}>
            <nav.i size={20} /><span className="text-[10px] font-semibold">{nav.l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
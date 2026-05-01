import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, FileText, Download, Calculator,
  ClipboardCheck, Building2, GraduationCap, User,
  ChevronRight, ChevronDown, CheckCircle2, AlertCircle,
  Clock, LayoutDashboard, FileSpreadsheet, Settings,
  Upload, Loader2, X, FileDown, CheckSquare,
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
      link.download = `Job_Analysis_Backup_${new Date().getTime()}.jobcompany`;
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
      2. กำหนดระดับ (1-3) K,S,A ตามมาตรฐาน
      3. ห้ามใช้คำว่า รู้จัก, เข้าใจ, ทราบ, รู้ ในจุดประสงค์
      4. ขึ้นต้นด้วยคำกริยาแสดงการกระทำ`;

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
                          type: "OBJECT", properties: { k: { type: "STRING" }, s: { type: "STRING" }, a: { type: "STRING" } }
                        },
                        levels: {
                          type: "OBJECT", properties: { k: { type: "INTEGER" }, s: { type: "INTEGER" }, a: { type: "INTEGER" } }
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

  // แก้ไขตรงนี้: แยกการอัปเดตงานหลักออกจากงานย่อยเพื่อป้องกันหน้าจอขาว
  const updateWorkplaceSubtask = (mIdx, sIdx, field, value) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      if (sIdx === null) {
        // อัปเดตงานหลัก (Duty)
        next[mIdx][field] = value;
      } else {
        // อัปเดตงานย่อย (Task)
        next[mIdx].subTasks[sIdx][field] = value;
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
      const newSuffix = (next[mIdx].subTasks?.length || 0) + 1;
      next[mIdx].subTasks.push({
        id: `W${tIdx}-${newSuffix}`,
        workplaceName: '',
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
        objectives: { k: '', s: '', a: '' },
        levels: { k: 1, s: 1, a: 1 },
        equipment: '',
        isAnalyzing: false
      });
      next[mIdx].isConfirmed = false;
      return next;
    });
  };

  const analyzeSingleWorkplaceSubtask = async (mIdx, sIdx) => {
    const activeKey = config.userApiKey || apiKey;
    if (!activeKey) return showStatus("กรุณาระบุ API Key ก่อน");

    const mainTask = workplaceMainTasks[mIdx];
    const subTask = mainTask.subTasks[sIdx];
    if (!subTask.workplaceName) return showStatus("กรุณาระบุชื่องานย่อย");

    setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].isAnalyzing = true; return n; });

    try {
      const systemPrompt = `วิเคราะห์ขั้นตอนการทำงานย่อย: "${subTask.workplaceName}" แตกเป็น 3-8 ขั้นตอน`;
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
                  objectives: { type: "OBJECT", properties: { k: { type: "STRING" }, s: { type: "STRING" }, a: { type: "STRING" } } },
                  levels: { type: "OBJECT", properties: { k: { type: "INTEGER" }, s: { type: "INTEGER" }, a: { type: "INTEGER" } } },
                  equipment: { type: "STRING" }
                }
              }
            }
          }
        }
      };

      const result = await callAI({ contents: [{ parts: [{ text: `Analyze steps for: ${subTask.workplaceName}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig });

      setWorkplaceMainTasks(prev => {
        const next = [...prev];
        next[mIdx].subTasks[sIdx].detailed_steps = result.detailed_steps || [];
        next[mIdx].subTasks[sIdx].isAnalyzing = false;
        return next;
      });
    } catch (e) {
      showStatus("ขัดข้อง");
      setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].isAnalyzing = false; return n; });
    }
  };

  const toggleConfirmWorkplaceTask = (mIdx) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      next[mIdx].isConfirmed = !next[mIdx].isConfirmed;
      return next;
    });
  };

  // --- Calculations ---
  const totalTrainingHours = useMemo(() => {
    return (Number(config.hoursPerDay) || 0) * (Number(config.daysPerWeek) || 0) * (Number(config.weeks) || 0);
  }, [config.hoursPerDay, config.daysPerWeek, config.weeks]);

  const workplaceTasksFlat = useMemo(() => {
    return workplaceMainTasks.flatMap((m, mIdx) => (m.subTasks || []).map((s, sIdx) => ({
      ...s,
      parentMainTaskName: cleanTaskName(m.name),
      mainTaskIndex: mIdx + 1,
      subTaskIndex: `${mIdx + 1}.${sIdx + 1}`
    })));
  }, [workplaceMainTasks]);

  const exportToWord = (elementId, filename) => {
    const content = document.getElementById(elementId);
    if (!content) return;
    const isLandscape = content.classList.contains('Section2');
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        @page Section1 { size: 21.0cm 29.7cm; margin: 1.5cm; }
        @page Section2 { size: 29.7cm 21.0cm; margin: 1.0cm; mso-page-orientation: landscape; }
        body, p, div, td, th { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 16pt; }
        table { border-collapse: collapse; width: 100%; border: 1px solid black; }
        th, td { border: 1px solid black; padding: 5px; }
      </style></head><body><div class="${isLandscape ? 'Section2' : 'Section1'}">${content.innerHTML}</div></body></html>`;
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
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
    { k: 'trainerName', l: 'ชื่อ-สกุล ครูฝึก', i: User },
    { k: 'trainerPosition', l: 'ตำแหน่งครูฝึก', i: Briefcase },
    { k: 'occupation', l: 'อาชีพ / ตำแหน่งงาน', i: HardHat },
    { k: 'department', l: 'ส่วนงาน / จุดฝึก', i: Building2 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

      {/* แถบชื่อระบบ (Corporate Style) */}
      <div className="bg-slate-900 text-white py-4 px-6 shadow-md flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ระบบวิเคราะห์งานสถานประกอบการ</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Professional Job Analysis Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={saveDataLocally} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-all"><Save size={14}/> บันทึกข้อมูล</button>
            <button onClick={() => fileInputRef.current.click()} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"><Upload size={14}/> โหลดข้อมูล</button>
            <input type="file" accept=".jobcompany" ref={fileInputRef} onChange={handleFileUploadLocal} className="hidden" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-8">
          {[
            { id: 'setup', l: '๑. ตั้งค่า', i: Settings },
            { id: 'workplace', l: '๒. วิเคราะห์งาน', i: Building2 },
            { id: 'reports', l: '๓. เอกสารรายงาน', i: FileText },
            { id: 'evaluation', l: '๔. แบบประเมิน', i: CheckSquare },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <t.i size={16} /> {t.l}
            </button>
          ))}
        </div>

        {/* SETUP TAB */}
        {activeTab === 'setup' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4"><Settings className="text-blue-600"/> การตั้งค่าข้อมูลพื้นฐาน</h2>
              
              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 text-xs font-bold text-blue-700 uppercase mb-2">ตั้งค่า AI Assistant</div>
                <select className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={config.aiProvider} onChange={e => setConfig({...config, aiProvider: e.target.value})}>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">ChatGPT</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
                <input type="password" placeholder="วาง API Key ที่นี่..." className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={config.userApiKey} onChange={e => setConfig({...config, userApiKey: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {setupFields.map(f => (
                  <div key={f.k}>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><f.i size={12}/> {f.l}</label>
                    <input
                      type={f.k.includes('Date') ? 'date' : 'text'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={config[f.k] || ''}
                      onChange={e => setConfig({...config, [f.k]: e.target.value})}
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-5 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-lg text-white shadow-md"><Clock size={24}/></div>
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase">เวลาฝึกปฏิบัติรวม</p>
                    <p className="text-2xl font-black text-blue-900">{totalTrainingHours} <span className="text-sm font-normal">ชั่วโมง</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORKPLACE TAB */}
        {activeTab === 'workplace' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><HardHat className="text-blue-600"/> วิเคราะห์งานสถานประกอบการ</h2>
              <button onClick={addWorkplaceMainTask} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-md"><Plus size={18}/> เพิ่มงานหลัก</button>
            </div>

            {workplaceMainTasks.map((main, mIdx) => (
              <div key={main.id} className={`bg-white rounded-xl border-2 transition-all ${main.isConfirmed ? 'border-emerald-200 shadow-sm' : 'border-slate-100'}`}>
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center bg-slate-50/50 rounded-t-xl">
                  <div className="flex-1 w-full">
                    <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block">งานหลัก {mIdx + 1}</span>
                    <input 
                      className={`w-full bg-white px-4 py-2 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${main.isConfirmed ? 'border-transparent text-slate-700 bg-transparent px-0' : 'border-slate-300'}`} 
                      placeholder="เช่น งานซ่อมเครื่องยนต์แก๊สโซลีน..." 
                      value={main.name} 
                      onChange={e => updateWorkplaceSubtask(mIdx, null, 'name', e.target.value)} 
                      readOnly={main.isConfirmed}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => analyzeWorkplaceMainTask(main.id)} disabled={main.isAnalyzing || main.isConfirmed || !main.name} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-black transition flex items-center gap-2 disabled:bg-slate-300">
                      {main.isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} ให้ AI ช่วยแตกงานย่อย
                    </button>
                    {!main.isConfirmed && <button onClick={() => removeWorkplaceMainTask(main.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={20}/></button>}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {(main.subTasks || []).map((sub, sIdx) => (
                    <div key={sIdx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-blue-500 w-8">{mIdx+1}.{sIdx+1}</span>
                        <input 
                          className="flex-1 bg-transparent border-b border-dashed border-slate-300 text-sm font-semibold py-1 outline-none focus:border-blue-500" 
                          value={sub.workplaceName} 
                          onChange={e => updateWorkplaceSubtask(mIdx, sIdx, 'workplaceName', e.target.value)}
                          placeholder="ชื่องานย่อย..."
                          readOnly={main.isConfirmed}
                        />
                        <div className="flex items-center gap-2">
                           {!main.isConfirmed && (
                             <button onClick={() => analyzeSingleWorkplaceSubtask(mIdx, sIdx)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition">
                               {sub.isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>}
                             </button>
                           )}
                           <button onClick={() => setCollapsedWorkplaceSubTasks(prev => { const s = new Set(prev); s.has(sub.id) ? s.delete(sub.id) : s.add(sub.id); return s; })} className="text-slate-400">
                             {collapsedWorkplaceSubTasks.has(sub.id) ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}
                           </button>
                        </div>
                      </div>

                      <div className={`pl-8 space-y-2 ${collapsedWorkplaceSubTasks.has(sub.id) ? 'hidden' : 'block'}`}>
                        {sub.detailed_steps?.map((step, si) => (
                          <div key={si} className="flex items-center gap-3 text-xs">
                            <span className="text-slate-400">{si + 1}.</span>
                            <input 
                              className="flex-1 bg-transparent border-b border-slate-100 py-1 outline-none" 
                              value={step.step_text} 
                              onChange={e => updateWorkplaceStepField(mIdx, sIdx, si, 'step_text', e.target.value)}
                              readOnly={main.isConfirmed}
                            />
                            <span className="text-[10px] font-bold text-slate-300">K{step.levels?.k} S{step.levels?.s}</span>
                          </div>
                        ))}
                        {!main.isConfirmed && (
                          <button onClick={() => addWorkplaceStepLocal(mIdx, sIdx)} className="text-[10px] font-bold text-blue-600 hover:underline">+ เพิ่มขั้นตอน</button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    {!main.isConfirmed && (
                      <button onClick={() => addWorkplaceSubtaskLocal(mIdx)} className="text-xs font-bold text-blue-600 hover:underline">+ เพิ่มงานย่อยแมนนวล</button>
                    )}
                    <button onClick={() => toggleConfirmWorkplaceTask(mIdx)} className={`px-6 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 ${main.isConfirmed ? 'bg-white border border-slate-300 text-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                      {main.isConfirmed ? <><Settings size={14}/> ปลดล็อกเพื่อแก้ไข</> : <><CheckCircle2 size={14}/> ยืนยันข้อมูลงานชุดนี้</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800"><FileText className="text-blue-600"/> รายงานแผนการฝึกอาชีพ</h2>
                <div className="flex gap-2">
                   <button onClick={() => setActiveReportView('dve0405')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeReportView === 'dve0405' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>ฝอ.1</button>
                   <button onClick={() => setActiveReportView('dve0406')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeReportView === 'dve0406' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>ฝอ.2</button>
                   <button onClick={() => exportToWord(activeReportView === 'dve0405' ? 'dve-0405-area' : 'dve-0406-area', 'Job_Analysis_Report')} className="ml-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition-all"><FileDown size={14}/> ดาวน์โหลด .doc</button>
                </div>
             </div>

             <div className="bg-slate-200 p-10 rounded-xl overflow-x-auto min-h-[600px]">
                <div id="dve-0405-area" className={`bg-white p-12 shadow-2xl mx-auto w-[21cm] font-serif text-black ${activeReportView !== 'dve0405' ? 'hidden' : ''}`}>
                    <h2 className="text-center font-bold underline uppercase mb-8 text-[18pt]">การวิเคราะห์งานในสถานประกอบการ</h2>
                    <div className="text-center mb-8 text-[16pt]">สถานประกอบการ: {config.companyName || '................'}</div>
                    <table className="w-full border-collapse border border-black text-[14pt]">
                       <thead>
                         <tr className="bg-gray-100 font-bold text-center">
                            <th className="border border-black p-2">ตำแหน่งงาน</th>
                            <th className="border border-black p-2">งานหลัก</th>
                            <th className="border border-black p-2">งานย่อย</th>
                            <th className="border border-black p-2 w-24">เวลาฝึก (ชม.)</th>
                         </tr>
                       </thead>
                       <tbody>
                          {workplaceTasksFlat.map((t, i) => (
                            <tr key={i}>
                               <td className="border border-black p-2 text-center">{config.occupation || '-'}</td>
                               <td className="border border-black p-2">{t.parentMainTaskName}</td>
                               <td className="border border-black p-2 font-bold">{t.workplaceName}</td>
                               <td className="border border-black p-2 text-center">{t.hours}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                </div>

                <div id="dve-0406-area" className={`bg-white p-12 shadow-2xl mx-auto w-[21cm] font-serif text-black ${activeReportView !== 'dve0406' ? 'hidden' : ''}`}>
                    {workplaceTasksFlat.map((task, idx) => (
                      <div key={idx} className="page-break mb-10 border-b border-gray-100 pb-10 last:border-0">
                         <h2 className="text-center font-bold text-[18pt] mb-6 underline uppercase">แผนการฝึกอาชีพรายหน่วยสถานประกอบการ</h2>
                         <p className="text-[16pt] mb-2">งานหลัก {task.mainTaskIndex}. {task.parentMainTaskName}</p>
                         <p className="text-[16pt] font-bold mb-4">งานย่อย {task.subTaskIndex}. {task.workplaceName} ({task.hours} ชม.)</p>
                         <table className="w-full border-collapse border border-black text-[14pt]">
                            <thead>
                              <tr className="bg-gray-50 font-bold text-center">
                                <th className="border border-black p-1 w-10">ที่</th>
                                <th className="border border-black p-1">ขั้นตอนปฏิบัติงาน</th>
                                <th className="border border-black p-1 w-12">K</th>
                                <th className="border border-black p-1 w-12">S</th>
                                <th className="border border-black p-1 w-12">A</th>
                              </tr>
                            </thead>
                            <tbody>
                              {task.detailed_steps?.map((step, si) => (
                                <tr key={si}>
                                   <td className="border border-black p-1 text-center">{si + 1}</td>
                                   <td className="border border-black p-1">{step.step_text}</td>
                                   <td className="border border-black p-1 text-center">{step.levels?.k}</td>
                                   <td className="border border-black p-1 text-center">{step.levels?.s}</td>
                                   <td className="border border-black p-1 text-center">{step.levels?.a}</td>
                                </tr>
                              ))}
                            </tbody>
                         </table>
                      </div>
                    ))}
                </div>
             </div>
          </div>
        )}

        {/* EVALUATION TAB */}
        {activeTab === 'evaluation' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800"><CheckSquare className="text-blue-600"/> แบบประเมินการปฏิบัติงาน</h2>
                <button onClick={() => exportToWord('eval-area', 'Evaluation_Report')} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition-all"><FileDown size={14}/> ดาวน์โหลด .doc</button>
             </div>

             <div className="bg-slate-200 p-10 rounded-xl overflow-x-auto">
                <div id="eval-area" className="bg-white p-12 shadow-2xl mx-auto w-[21cm] font-serif text-black">
                   {workplaceTasksFlat.map((task, idx) => (
                     <div key={idx} className="page-break mb-12 border-b-2 border-dashed border-slate-300 pb-12 last:border-0 last:mb-0">
                        <h2 className="text-center font-bold text-[18pt] mb-8 uppercase">แบบประเมินการปฏิบัติงาน</h2>
                        <div className="text-[16pt] mb-6">
                           <p><b>สถานประกอบการ:</b> {config.companyName || '................'}</p>
                           <p><b>งานย่อยที่ประเมิน:</b> {task.subTaskIndex}. {task.workplaceName}</p>
                        </div>
                        <table className="w-full border-collapse border border-black text-[14pt]">
                           <thead>
                             <tr className="bg-gray-100 font-bold text-center">
                                <th className="border border-black p-2 text-left">รายการจุดประสงค์การปฏิบัติงาน</th>
                                <th className="border border-black p-2 w-12">5</th>
                                <th className="border border-black p-2 w-12">4</th>
                                <th className="border border-black p-2 w-12">3</th>
                                <th className="border border-black p-2 w-12">2</th>
                                <th className="border border-black p-2 w-12">1</th>
                             </tr>
                           </thead>
                           <tbody>
                             {task.detailed_steps?.map((step, si) => (
                               <tr key={si}>
                                  <td className="border border-black p-2">{step.step_text}</td>
                                  {[5,4,3,2,1].map(n => <td key={num} className="border border-black"></td>)}
                               </tr>
                             ))}
                           </tbody>
                        </table>
                        <div className="flex justify-between mt-12 text-[16pt]">
                           <div className="text-center"><p className="mb-4">ลงชื่อ.........................................</p><p>นักเรียน</p></div>
                           <div className="text-center"><p className="mb-4">ลงชื่อ.........................................</p><p>ครูฝึก ({config.trainerName || '................'})</p></div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

      </main>

      <footer className="text-center text-slate-400 text-[10px] py-10 border-t border-slate-200 mt-10">
        <p>© 2026 สุกฤษฏิ์พล โชติอรรฐพล. All Rights Reserved. พัฒนาโดย นายสุกฤษฏิ์พล โชติอรรฐพล</p>
      </footer>
    </div>
  );
};

export default App;
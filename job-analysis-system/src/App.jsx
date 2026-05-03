import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, FileText,
  ClipboardCheck, Building2, User,
  ChevronRight, ChevronDown, AlertCircle,
  Clock, FileSpreadsheet, Settings,
  Upload, Loader2, X, FileDown,
  Wand2, HardHat, Briefcase,
  RotateCcw, Sparkles, Calendar,
  Key, Save, CheckCircle2, Cloud, Search, Filter, UploadCloud, MapPin, DownloadCloud,
  MessageSquare, Star
} from 'lucide-react';

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMZBGSWinbV8P8KCsxQXGw-v6AiPnaHW2fawUyNUu3m7bCNF6in6S7pPmNJY4gZ2uWFg/exec"; 

const apiKey = "";
const FILE_SECRET_KEY = "@Sukritpol2528"; 

const BEHAVIOR_OPTIONS = [
  'ความซื่อสัตย์', 'ระเบียบวินัยและตรงต่อเวลา', 'ความรับผิดชอบ', 'ใฝ่เรียนรู้',
  'ขยันและอดทน', 'ประหยัด', 'ความปลอดภัย', 'ความคิดสร้างสรรค์', 'ทำงานเป็นทีม', 'จิตสาธารณะ'
];

const PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", 
  "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา", 
  "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", 
  "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", 
  "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", 
  "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม", 
  "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", 
  "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
];

const App = () => {
  // Cloud & Auth States
  const [cloudData, setCloudData] = useState([]);
  const [filterProvince, setFilterProvince] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // แจ้งลบข้อมูล State
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // ระบบประเมินระบบ State
  const [systemFeedback, setSystemFeedback] = useState({ ux: 5, ai: 5, speed: 5, reports: 5, overall: 5, suggestion: '' });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // ระบบบันทึกงานและดาวน์โหลด
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(null);
  const fileInputRef = useRef(null);
  const evalFileInputRef = useRef(null);

  // สถานะรูปแบบแบบประเมินและการเลือกกิจนิสัย
  const [activeEvalView, setActiveEvalView] = useState('eval_workplace');
  const [activeReportView, setActiveReportView] = useState('dve0405');
  const [evalFormType, setEvalFormType] = useState('5');
  const [selectedBehaviors, setSelectedBehaviors] = useState([...BEHAVIOR_OPTIONS]);

  // UI States
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
    collegeName: '',
    companyName: '',
    province: '', // เพิ่มฟิลด์จังหวัด
    level: 'ปวช. และ ปวส.',
    academicYear: '๒๕๖๙',
    startDate: '',
    endDate: '',
    hoursPerDay: 8,
    daysPerWeek: 5,
    weeks: 18,
    trainerName: '',
    trainerPosition: '',
    occupation: ''
  });

  const [workplaceMainTasks, setWorkplaceMainTasks] = useState([
    { id: Date.now(), name: '', isAnalyzing: false, isConfirmed: false, subTasks: [] }
  ]);

  // --- Fetch Data from Google Sheets ---
  const fetchCloudData = async () => {
    try {
      const response = await fetch(GAS_WEB_APP_URL);
      const data = await response.json();
      data.sort((a, b) => new Date(b.createdAtStr) - new Date(a.createdAtStr));
      setCloudData(data);
    } catch (err) {
      console.error("Fetch cloud data error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudData();
    }
  }, [activeTab]);

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

  // --- Data Save/Load Functions ---
  const encryptPayload = (text) => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ FILE_SECRET_KEY.charCodeAt(i % FILE_SECRET_KEY.length));
    }
    return btoa(unescape(encodeURIComponent(result)));
  };

  const decryptPayload = (encodedText) => {
    let decoded = decodeURIComponent(escape(atob(encodedText)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ FILE_SECRET_KEY.charCodeAt(i % FILE_SECRET_KEY.length));
    }
    return result;
  };

  const generateFileName = (conf) => {
    let filenameParts = [];
    if (conf.occupation && conf.occupation.trim() !== '') filenameParts.push(conf.occupation.trim());
    else if (conf.companyName && conf.companyName.trim() !== '') filenameParts.push(conf.companyName.trim());
    
    let baseName = `Workplace_${new Date().getTime()}`;
    if (filenameParts.length > 0) {
        baseName = filenameParts.join('_').replace(/[/\\?%*:|"<>]/g, '-');
    }
    return `ทวิภาคี_${baseName}.dvedata`;
  }

  const saveDataLocally = () => {
    showStatus('กำลังบันทึกข้อมูลลงเครื่อง...');
    try {
      const payload = JSON.stringify({ config, workplaceMainTasks, selectedBehaviors });
      const encryptedData = encryptPayload(payload);
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = generateFileName(config);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
      showStatus('บันทึกข้อมูลลงเครื่องสำเร็จ!');
    } catch (err) {
      console.error(err);
      showStatus('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const downloadCloudItemAsFile = (item) => {
    showStatus(`กำลังดาวน์โหลดข้อมูลของ ${item.companyName}...`);
    try {
      const payload = JSON.stringify({ config: item.config, workplaceMainTasks: item.workplaceMainTasks, selectedBehaviors: item.selectedBehaviors });
      const encryptedData = encryptPayload(payload);
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = generateFileName(item.config || {});
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
      showStatus('ดาวน์โหลดไฟล์สำเร็จ!');
    } catch (err) {
      console.error(err);
      showStatus('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    }
  };

  const loadFromCloudItem = (item) => {
    if (window.confirm('คำเตือน: การนำเข้าข้อมูลจากคลาวด์จะทับข้อมูลปัจจุบันของคุณที่กำลังทำอยู่ทั้งหมด ต้องการดำเนินการต่อหรือไม่?')) {
      setConfig(item.config || config);
      setWorkplaceMainTasks(item.workplaceMainTasks || []);
      setSelectedBehaviors(item.selectedBehaviors || BEHAVIOR_OPTIONS);
      showStatus('นำเข้าข้อมูลจากคลังกลางสำเร็จ!');
      setActiveTab('workplace');
    }
  };

  const handleFileUploadLocal = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resetInputs = () => { if (fileInputRef.current) fileInputRef.current.value = ''; };

    const applyParsed = (parsed) => {
      if (!parsed || typeof parsed !== 'object' || (!parsed.config && !parsed.workplaceMainTasks)) {
        showStatus('เปิดไฟล์ไม่สำเร็จ: ไม่พบข้อมูลแผนฝึกอาชีพภายในไฟล์นี้');
        return false;
      }
      if (parsed.config) setConfig(parsed.config);
      if (parsed.workplaceMainTasks) setWorkplaceMainTasks(parsed.workplaceMainTasks);
      if (parsed.selectedBehaviors) setSelectedBehaviors(parsed.selectedBehaviors);
      return true;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target.result.trim();
      try {
        if (applyParsed(JSON.parse(rawText))) { showStatus('โหลดข้อมูลสำเร็จ!'); resetInputs(); return; }
      } catch (_) {}
      try {
        if (applyParsed(JSON.parse(decryptPayload(rawText)))) { showStatus('โหลดข้อมูลสำเร็จ!'); resetInputs(); return; }
      } catch (_) {}
      try {
        if (applyParsed(JSON.parse(atob(rawText)))) { showStatus('โหลดข้อมูลสำเร็จ!'); resetInputs(); return; }
      } catch (_) {}
      showStatus('เปิดไฟล์ไม่สำเร็จ: ไฟล์เสียหายหรือไม่รองรับรูปแบบนี้');
      resetInputs();
    };
    reader.onerror = () => { showStatus('เปิดไฟล์ไม่สำเร็จ: ไม่สามารถอ่านไฟล์ได้'); resetInputs(); };
    reader.readAsText(file, 'UTF-8');
  };

  const shareToCloud = async () => {
    if (!config.companyName?.trim()) return showStatus("กรุณาระบุชื่อสถานประกอบการก่อนแชร์");
    if (!config.province?.trim()) return showStatus("กรุณาระบุจังหวัดของสถานประกอบการ");
    if (!config.trainerName?.trim()) return showStatus("กรุณาระบุชื่อ-สกุล ครูฝึก (ระบบจะใช้เป็นชื่อผู้แชร์)");

    showStatus("กำลังอัปโหลดไปยังคลังข้อมูลกลาง...");
    try {
      const payload = {
        action: 'shareData',
        config,
        workplaceMainTasks,
        selectedBehaviors,
        companyName: config.companyName,
        province: config.province,
        creatorName: config.trainerName,
        level: config.level,
      };

      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });

      showStatus("อัปโหลดและแชร์ข้อมูลเข้าสู่คลังกลางสำเร็จ!");
      setActiveTab('cloud');
    } catch (err) {
      console.error(err);
      showStatus("เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองอีกครั้ง");
    }
  };

  const submitDeleteRequest = async () => {
    if (!deleteReason.trim()) return showStatus("กรุณาระบุเหตุผลการลบ");
    setIsDeleting(true);
    try {
      const payload = {
        action: 'deleteRequest',
        id: deleteModalItem.id,
        companyName: deleteModalItem.companyName,
        reason: deleteReason
      };
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      showStatus("ส่งคำขอลบข้อมูลเรียบร้อยแล้ว");
      setDeleteModalItem(null);
      setDeleteReason('');
      fetchCloudData();
    } catch (error) {
      showStatus("เกิดข้อผิดพลาดในการส่งคำขอลบ");
    }
    setIsDeleting(false);
  };

  const submitFeedback = async () => {
    setIsSubmittingFeedback(true);
    try {
      const payload = {
        action: 'systemFeedback',
        feedback: systemFeedback,
        trainerName: config.trainerName || 'ไม่ระบุชื่อ',
        timestamp: new Date().toISOString()
      };
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      showStatus("ขอบคุณสำหรับการประเมินและข้อเสนอแนะครับ!");
      setSystemFeedback({ ux: 5, ai: 5, speed: 5, reports: 5, overall: 5, suggestion: '' });
      setTimeout(() => setActiveTab('setup'), 2000);
    } catch (error) {
      showStatus("เกิดข้อผิดพลาดในการส่งแบบประเมิน");
    }
    setIsSubmittingFeedback(false);
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
            generationConfig: { responseMimeType: "application/json", ...(payload.generationConfig || {}) }
          };

          const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedPayload) });
          if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
          const result = await response.json();
          text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        } else if (provider === 'openai') {
          const key = config.openaiApiKey?.trim();
          if (!key) throw new Error("กรุณาระบุ OpenAI API Key");
          const messages = [{ role: 'system', content: systemPromptText + jsonInstruction }];
          const userContent = [];
          payload.contents[0].parts.forEach(p => { if (p.text) userContent.push({ type: 'text', text: p.text }); });
          messages.push({ role: 'user', content: userContent });
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: messages, response_format: { type: "json_object" } })
          });
          if (!response.ok) throw new Error(`OpenAI Error`);
          const result = await response.json();
          text = result.choices[0].message.content;

        } else if (provider === 'deepseek') {
          const key = config.deepseekApiKey?.trim();
          if (!key) throw new Error("กรุณาระบุ DeepSeek API Key");
          const messages = [{ role: 'system', content: systemPromptText + jsonInstruction }];
          let userText = "";
          payload.contents[0].parts.forEach(p => { if (p.text) userText += p.text + "\n"; });
          messages.push({ role: 'user', content: userText });
          const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model: 'deepseek-chat', messages: messages, response_format: { type: "json_object" } })
          });
          if (!response.ok) throw new Error(`DeepSeek Error`);
          const result = await response.json();
          text = result.choices[0].message.content;

        } else if (provider === 'claude') {
          const key = config.claudeApiKey?.trim();
          if (!key) throw new Error("กรุณาระบุ Claude API Key");
          const userContent = [];
          payload.contents[0].parts.forEach(p => { if (p.text) userContent.push({ type: 'text', text: p.text }); });
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerously-allow-browser': 'true' },
            body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 4000, system: systemPromptText + jsonInstruction, messages: [{ role: 'user', content: userContent }] })
          });
          if (!response.ok) throw new Error(`Claude Error`);
          const result = await response.json();
          text = result.content[0].text;
        }

        if (!text) throw new Error("AI ไม่ตอบกลับ");
        try { return JSON.parse(text); } catch (e) {
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
    if (!activeKey?.trim() && config.aiProvider !== 'gemini') return showStatus(`กรุณาใส่ API Key ของ ${config.aiProvider} ก่อนใช้งาน`);
    if (config.aiProvider === 'gemini' && !config.userApiKey?.trim() && !apiKey) return showStatus("กรุณาใส่ Gemini API Key ก่อนใช้งาน");

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
      5. **กฎเหล็กเพิ่มเติม (งานปฏิบัติการ)**: หากเป็นลักษณะงานช่างหรืองานวิชาชีพ (เช่น ถอด, ประกอบ, ติดตั้ง, ซ่อม, เช็ค, ตรวจสอบ) ต้องกำหนดขั้นตอนแรกเป็นการ "จัดเตรียมเครื่องมือและอุปกรณ์" และขั้นตอนสุดท้ายเป็นการ "จัดเก็บเครื่องมือและทำความสะอาด" เสมอ
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
          workplaceName: cleanTaskName(st.workplaceName),
          hours: 10,
          detailed_steps: st.detailed_steps || []
        };
      });

      setWorkplaceMainTasks(prev => prev.map(t => t.id === taskId ? { ...t, subTasks: newSubTasks, isAnalyzing: false } : t));
      showStatus("วิเคราะห์งานสถานประกอบการสำเร็จ");
    } catch (e) {
      showStatus("ขัดข้อง: " + e.message);
      setWorkplaceMainTasks(prev => prev.map(t => t.id === taskId ? { ...t, isAnalyzing: false } : t));
    }
  };

  const updateWorkplaceSubtask = (mIdx, sIdx, field, value) => {
    setWorkplaceMainTasks(prev => {
      const next = [...prev];
      next[mIdx].subTasks[sIdx][field] = value;
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
    if (!activeKey?.trim() && config.aiProvider !== 'gemini') return showStatus(`กรุณาใส่ API Key ของ ${config.aiProvider} ก่อนใช้งาน`);
    if (config.aiProvider === 'gemini' && !config.userApiKey?.trim() && !apiKey) return showStatus("กรุณาใส่ Gemini API Key ก่อนใช้งาน");

    const mainTask = workplaceMainTasks[mIdx];
    const subTask = mainTask.subTasks[sIdx];

    if (!subTask.workplaceName) return showStatus("กรุณาระบุชื่องานย่อยก่อนวิเคราะห์");

    setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].isAnalyzing = true; return n; });

    try {
      const systemPrompt = `วิเคราะห์งานย่อย: "${subTask.workplaceName}" ภายใต้งานหลัก: "${mainTask.name}"
      1. แตกเป็น "ขั้นตอนการปฏิบัติงาน" (Performance Steps) 3-8 ขั้นตอน
      2. กำหนดระดับ (1-3) K,S,A,Ap และ "จุดประสงค์เชิงพฤติกรรม" ห้ามใช้คำว่า "รู้จัก", "เข้าใจ"
      3. ห้ามมีคำว่า "การ", "ศึกษา", "เรียนรู้" ในขั้นตอนและขั้นตอนต้องขึ้นต้นด้วยคำกริยา
      4. ระบุ "สื่อ/อุปกรณ์" (equipment)`;

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
        next[mIdx].subTasks[sIdx].detailed_steps = result.detailed_steps || [];
        next[mIdx].subTasks[sIdx].workplaceName = cleanTaskName(subTask.workplaceName);
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
    if (!activeKey?.trim() && config.aiProvider !== 'gemini') return showStatus(`กรุณาใส่ API Key ของ ${config.aiProvider} ก่อนใช้งาน`);
    if (config.aiProvider === 'gemini' && !config.userApiKey?.trim() && !apiKey) return showStatus("กรุณาใส่ Gemini API Key ก่อนใช้งาน");

    const step = workplaceMainTasks[mIdx].subTasks[sIdx].detailed_steps[stepIdx];
    if (!step.step_text) return showStatus("กรุณาระบุขั้นตอนการทำงานก่อนวิเคราะห์");

    setWorkplaceMainTasks(prev => { const n = [...prev]; n[mIdx].subTasks[sIdx].detailed_steps[stepIdx].isAnalyzing = true; return n; });

    try {
      const systemPrompt = `วิเคราะห์ขั้นตอนการทำงาน: "${step.step_text}"
      กำหนดจุดประสงค์เชิงพฤติกรรม (K, S, A, Ap) ด้วย Action Verbs และระดับความสามารถ (1-3)
      - K: บอก, ระบุ, อธิบาย
      - S: ปฏิบัติ, สาธิต, สร้าง
      - A: ยอมรับ, ระมัดระวัง
      - Ap: ประยุกต์ใช้, แก้ปัญหา
      - ระบุ "สื่อ/อุปกรณ์" (equipment) ที่ต้องใช้`;

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
    if (!workplaceMainTasks[mIdx].isConfirmed) showStatus("ยืนยันข้อมูลเรียบร้อย นำไปจัดทำรายงานได้");
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
    const isPvs = config.level.includes('ปวส');
    const isPvc = config.level.includes('ปวช');
    const minWeeks = isPvs ? 15 : isPvc ? 18 : null;
    if (minWeeks && trainingDuration.weeks < minWeeks) {
      return `ระยะเวลาฝึกไม่ครบตามเกณฑ์! ระดับ${isPvs ? 'ปวส.' : 'ปวช.'} ต้องไม่น้อยกว่า ${minWeeks} สัปดาห์ (ปัจจุบัน ${trainingDuration.weeks} สัปดาห์ ${trainingDuration.days} วัน)`;
    }
    return null;
  }, [trainingDuration, config.level]);

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
    { k: 'collegeName', l: 'ชื่อวิทยาลัย', i: Building2 },
    { k: 'companyName', l: 'ชื่อสถานประกอบการ', i: Briefcase },
    { k: 'level', l: 'ระดับชั้น', i: User },
    { k: 'academicYear', l: 'ปีการศึกษา', i: Calendar },
    { k: 'startDate', l: 'วันเริ่มฝึก (ฝอ.1)', i: Clock },
    { k: 'endDate', l: 'วันสิ้นสุดฝึก (ฝอ.1)', i: Clock },
    { k: 'trainerName', l: 'ชื่อ-สกุล ครูฝึก', i: User },
    { k: 'trainerPosition', l: 'ตำแหน่งครูฝึก', i: Briefcase },
    { k: 'occupation', l: 'อาชีพ / ตำแหน่งงานที่ฝึก', i: HardHat }
  ];

  return (
    <div className={`min-h-screen font-sans text-slate-900 pb-20 font-serif transition-colors duration-500 ${activeTab === 'cloud' ? 'bg-slate-800' : 'bg-slate-50'}`}>
      {/* แถบชื่อระบบ */}
      <div className="bg-indigo-700 text-white py-3 px-4 text-center text-base md:text-lg font-black shadow-md font-serif z-[70] relative flex items-center justify-center gap-2">
        <ClipboardCheck size={22} className="shrink-0" />
        <span>ระบบวิเคราะห์งานในสถานประกอบการ</span>
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 flex items-center justify-between px-4 md:px-6 shadow-sm overflow-x-auto hide-scrollbar">
        {/* Navigation Tabs */}
        <div className="hidden lg:flex gap-1 bg-slate-100 p-1.5 rounded-2xl whitespace-nowrap">
          {[
            { id: 'setup', l: '๑. ตั้งค่า', i: Settings },
            { id: 'workplace', l: '๒. วิเคราะห์งาน', i: Building2 },
            { id: 'reports', l: '๓. แสดงรายงาน', i: FileText },
            { id: 'evaluation', l: '๔. แบบประเมิน', i: ClipboardCheck },
            { id: 'share', l: '๕. แชร์คลังแผนฝึก', i: UploadCloud },
            { id: 'cloud', l: '๖. คลังส่วนกลาง', i: Cloud },
            { id: 'feedback', l: '๗. ประเมินระบบ', i: Star },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm scale-105' : 'text-slate-500 hover:text-indigo-600'}`}>
              <t.i size={16} /> {t.l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          <div className="flex items-center gap-2">
            <input type="file" accept=".dvedata,.jobcompany" ref={fileInputRef} onChange={handleFileUploadLocal} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 transition duration-300 flex items-center gap-1 text-xs font-bold bg-emerald-50 rounded-full px-3 md:px-4 border border-emerald-100" title="อัปโหลดไฟล์งานเดิมจากเครื่อง">
              <Upload size={16} />
              <span className="hidden md:inline">โหลดงาน</span>
            </button>
            <button onClick={saveDataLocally} className="p-2 text-indigo-600 hover:text-white hover:bg-indigo-600 transition duration-300 flex items-center gap-1 text-xs font-bold bg-indigo-50 rounded-full px-3 md:px-4 border border-indigo-100" title="บันทึกงานลงเครื่อง">
              <Save size={16} />
              <span className="hidden md:inline">เซฟงาน</span>
            </button>
          </div>
          <button onClick={() => window.location.reload()} className="p-2 text-slate-400 hover:text-indigo-600 transition active:rotate-180 duration-500 bg-slate-100 rounded-full" title="รีเฟรชหน้าจอ"><RotateCcw size={16} /></button>
        </div>
      </header>

      {statusMessage && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-indigo-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-3">
          <Sparkles className="text-indigo-400" size={18} />
          <span className="text-sm font-bold">{statusMessage}</span>
        </div>
      )}

      {/* Modal ยืนยันแจ้งลบข้อมูล */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteModalItem(null)}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-red-600 flex items-center gap-2"><Trash2 /> แจ้งลบข้อมูล</h3>
              <button onClick={() => setDeleteModalItem(null)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <p className="text-sm font-bold text-slate-600 mb-4 leading-relaxed">
              คุณต้องการส่งคำขอเพื่อแจ้งลบข้อมูลของบริษัท <br/>
              <span className="text-red-600 text-base">{deleteModalItem.companyName}</span> ใช่หรือไม่?
            </p>
            <textarea
              className="w-full border border-slate-200 bg-slate-50 rounded-xl p-4 text-sm font-serif focus:ring-2 focus:ring-red-500 outline-none mb-6 shadow-inner"
              rows="3"
              placeholder="กรุณาระบุเหตุผลที่ต้องการลบ (เช่น ข้อมูลซ้ำ, ข้อมูลผิดพลาด หรืออื่นๆ)..."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
            ></textarea>
            <div className="flex gap-3">
              <button onClick={submitDeleteRequest} disabled={isDeleting} className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-red-700 disabled:bg-slate-300 flex justify-center items-center gap-2 transition-all active:scale-95 text-sm">
                {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} ยืนยันการแจ้งลบ
              </button>
              <button onClick={() => setDeleteModalItem(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black hover:bg-slate-200 transition-all text-sm">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันก่อนดาวน์โหลดรายงาน */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDownloadConfirm(null)}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            {['eval_workplace', 'eval_supervision', 'dve1102'].includes(showDownloadConfirm) && workplaceTasksFlat.length === 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setShowDownloadConfirm(null)} className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 font-bold text-sm transition-colors">
                    <X size={18} /> ยกเลิก
                  </button>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">แบบประเมิน</span>
                </div>
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="bg-emerald-100 p-4 rounded-full text-emerald-600"><Upload size={36} /></div>
                  <div>
                    <p className="text-base font-black text-emerald-900 mb-1">ยังไม่มีข้อมูลแบบประเมิน</p>
                    <p className="text-xs font-bold text-emerald-700 mb-4">โปรดวิเคราะห์งานสถานประกอบการก่อน</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <button onClick={() => setShowDownloadConfirm(null)} className="text-slate-400 hover:text-red-500 transition-colors" title="ยกเลิก"><X size={22} /></button>
                </div>
                <div className="flex justify-center mb-4">
                  <div className="bg-amber-100 p-4 rounded-full text-amber-600"><AlertCircle size={40} /></div>
                </div>
                <h3 className="text-xl font-black text-center text-slate-800 mb-2 uppercase">แจ้งเตือน</h3>
                <p className="text-center text-sm text-slate-500 mb-6 font-bold leading-relaxed">ขอให้คุณครูตรวจสอบความถูกต้อง<br />ของข้อมูลอีกครั้งครับ</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      if (showDownloadConfirm === 'reports') {
                        exportToWord('dve-all-area', 'DVE_Reports_Workplace_Only');
                      } else if (showDownloadConfirm === 'dve0405') {
                        exportToWord('dve-0405-area', 'DVE-04-05_แผนฝึกตลอดหลักสูตร');
                      } else if (showDownloadConfirm === 'dve0406') {
                        exportToWord('dve-0406-area', 'DVE-04-06_แผนฝึกรายหน่วย');
                      } else if (showDownloadConfirm === 'eval_workplace') {
                        exportToWord('dve-eval-workplace-area', 'DVE_Eval_Workplace');
                      } else if (showDownloadConfirm === 'eval_supervision') {
                        exportToWord('dve-supervision-area', 'DVE_Supervision');
                      } else if (showDownloadConfirm === 'dve1102') {
                        exportToWord('dve-11-02-area', 'DVE_11_02_Summary');
                      }
                      setShowDownloadConfirm(null);
                    }}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-sm uppercase"
                  >
                    รับทราบและดาวน์โหลด
                  </button>
                  <button onClick={() => setShowDownloadConfirm(null)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 active:scale-95 transition-all text-sm">
                    ยกเลิก
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* SETUP TAB */}
        {activeTab === 'setup' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 font-serif">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-black mb-8 text-indigo-700 underline underline-offset-8 uppercase font-serif">การตั้งค่าและกำหนดข้อมูลพื้นฐาน</h2>

              <div className="mb-8 bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2"><Wand2 size={18} /> กรอก API Key ลงในช่อง</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-2"><Settings size={12} /> เลือกผู้ให้บริการ API Key </label>
                    <select
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-white shadow-sm"
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
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-2"><Key size={12} /> API Key สำหรับ {config.aiProvider === 'openai' ? 'ChatGPT' : config.aiProvider === 'claude' ? 'Claude' : config.aiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'}</label>
                    {(!config.aiProvider || config.aiProvider === 'gemini') && (
                      <input type="password" placeholder="วาง Gemini API Key ที่นี่..." className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 outline-none transition font-bold shadow-inner text-sm font-serif bg-red-50 border-red-200 focus:ring-red-500 text-red-900 placeholder-red-300" value={config.userApiKey || ''} onChange={e => setConfig({ ...config, userApiKey: e.target.value })} />
                    )}
                    {config.aiProvider === 'openai' && (
                      <input type="password" placeholder="วาง OpenAI API Key (sk-...) ที่นี่..." className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 outline-none transition font-bold shadow-inner text-sm font-serif bg-emerald-50 border-emerald-200 focus:ring-emerald-500 text-emerald-900 placeholder-emerald-300" value={config.openaiApiKey || ''} onChange={e => setConfig({ ...config, openaiApiKey: e.target.value })} />
                    )}
                    {config.aiProvider === 'claude' && (
                      <input type="password" placeholder="วาง Anthropic API Key ที่นี่..." className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 outline-none transition font-bold shadow-inner text-sm font-serif bg-orange-50 border-orange-200 focus:ring-orange-500 text-orange-900 placeholder-orange-300" value={config.claudeApiKey || ''} onChange={e => setConfig({ ...config, claudeApiKey: e.target.value })} />
                    )}
                    {config.aiProvider === 'deepseek' && (
                      <input type="password" placeholder="วาง DeepSeek API Key ที่นี่..." className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 outline-none transition font-bold shadow-inner text-sm font-serif bg-blue-50 border-blue-200 focus:ring-blue-500 text-blue-900 placeholder-blue-300" value={config.deepseekApiKey || ''} onChange={e => setConfig({ ...config, deepseekApiKey: e.target.value })} />
                    )}

                    {(!config.aiProvider || config.aiProvider === 'gemini') && (
                      <div className="mt-2 text-right">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold inline-flex items-center justify-end gap-1 font-serif transition-colors">
                          <Sparkles size={12} /> คลิกขอรับ API Key ฟรี
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* จังหวัด */}
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-serif"><MapPin size={12} /> จังหวัดที่ตั้งสถานประกอบการ</label>
                    <select
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold shadow-inner text-sm font-serif bg-slate-50"
                      value={config.province || ''}
                      onChange={e => setConfig({ ...config, province: e.target.value })}
                    >
                      <option value="">-- เลือกจังหวัด --</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                
                {setupFields.map(f => (
                  <div key={f.k}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-serif"><f.i size={12} /> {f.l}</label>
                    {f.k === 'level' ? (
                      <select
                        className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold shadow-inner text-sm font-serif bg-slate-50"
                        value={config.level || ''}
                        onChange={e => setConfig({ ...config, level: e.target.value })}
                      >
                        <option value="ปวช.">ปวช.</option>
                        <option value="ปวส.">ปวส.</option>
                        <option value="ปวช. และ ปวส.">ปวช. และ ปวส.</option>
                        <option value="ปริญญาตรี">ปริญญาตรี</option>
                      </select>
                    ) : (
                      <input
                        type={f.k === 'startDate' || f.k === 'endDate' ? 'date' : 'text'}
                        className={`w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold shadow-inner text-sm font-serif bg-slate-50`}
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
                    )}
                  </div>
                ))}
                {/* แสดงระยะเวลาฝึกที่คำนวณได้ */}
                {trainingDuration && (
                  <div className="md:col-span-2 bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-800">ระยะเวลาฝึก: {trainingDuration.weeks} สัปดาห์ {trainingDuration.days > 0 ? `${trainingDuration.days} วัน` : ''} (รวม {trainingDuration.totalDays} วัน)</span>
                  </div>
                )}
                {/* แจ้งเตือนหากสัปดาห์ไม่ครบตามเกณฑ์ */}
                {trainingWeeksWarning && (
                  <div className="md:col-span-2 bg-red-50 border border-red-300 p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-red-700">{trainingWeeksWarning}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-indigo-600 p-10 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-center text-center font-serif">
              <h3 className="font-bold flex items-center justify-center gap-2 mb-6 text-indigo-100 uppercase tracking-widest font-serif"><Clock /> เวลาฝึกปฏิบัติรวม</h3>
              <p className="text-7xl font-black tracking-tighter">{totalTrainingHours} <span className="text-xl font-normal opacity-50 uppercase font-serif">ชม.</span></p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="bg-white/10 p-3 rounded-2xl"><p className="text-[9px] font-bold opacity-50 uppercase">ชั่วโมง/วัน</p><input type="number" className="bg-transparent text-center text-xl font-black outline-none w-full font-serif" value={config.hoursPerDay} onChange={e => setConfig({ ...config, hoursPerDay: e.target.value })} /></div>
                <div className="bg-white/10 p-3 rounded-2xl"><p className="text-[9px] font-bold opacity-50 uppercase">วัน/สัปดาห์</p><input type="number" min="1" max="7" className="bg-transparent text-center text-xl font-black outline-none w-full font-serif" value={config.daysPerWeek} onChange={e => setConfig({ ...config, daysPerWeek: e.target.value })} /></div>
                <div className="bg-white/10 p-3 rounded-2xl"><p className="text-[9px] font-bold opacity-50 uppercase">สัปดาห์</p><input type="number" className="bg-transparent text-center text-xl font-black outline-none w-full font-serif" value={config.weeks} onChange={e => setConfig({ ...config, weeks: e.target.value })} />{trainingDuration && <p className="text-[8px] opacity-60 mt-1">(คำนวณจากวันฝึก)</p>}</div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10"><Clock size={240} /></div>
            </div>
          </div>
        )}

        {/* WORKPLACE TAB */}
        {activeTab === 'workplace' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500 font-serif">
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm font-serif">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 border-b pb-6 gap-6">
                <div>
                  <h2 className="text-2xl font-black text-indigo-900 uppercase flex items-center gap-3 font-serif"><HardHat /> ๒. งานในสถานประกอบการ ({workplaceMainTasks.length}/100)</h2>
                  <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest italic">วิเคราะห์งานทุกลำดับให้ละเอียดครบถ้วนด้วยระบบ AI</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={addWorkplaceMainTask} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-indigo-700 transition flex items-center gap-3 active:scale-95 font-serif">
                    <Plus size={18} /> เพิ่มงานหลัก
                  </button>
                </div>
              </div>
              <div className="space-y-10">
                {workplaceMainTasks.map((main, mIdx) => (
                  <div key={main.id} className={`bg-slate-50 p-8 rounded-[40px] border shadow-inner relative group font-serif transition-colors ${main.isConfirmed ? 'border-green-200' : 'border-slate-100'}`}>
                    <div className={`flex flex-col md:flex-row gap-8 font-serif ${collapsedWorkplaceTasks.has(main.id) ? 'mb-0' : 'mb-10'}`}>
                      <div className="flex-1 space-y-5">
                        <div>
                          <div className="flex items-center justify-between mb-0">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-serif">งานหลักที่คุณครูฝึกสอนในบริษัท (งานที่ {mIdx + 1})</label>
                            {(main.subTasks || []).length > 0 && (
                              <button
                                type="button"
                                onClick={() => setCollapsedWorkplaceTasks(prev => { const s = new Set(prev); s.has(main.id) ? s.delete(main.id) : s.add(main.id); return s; })}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                              >
                                {collapsedWorkplaceTasks.has(main.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                {collapsedWorkplaceTasks.has(main.id) ? 'แสดง' : 'ซ่อน'}ข้อมูล
                              </button>
                            )}
                          </div>
                          <input className={`w-full mt-2 bg-white px-6 py-4 rounded-3xl border font-black text-base outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm font-serif ${main.isConfirmed ? 'border-transparent text-slate-700' : 'border-slate-100 text-slate-900'}`} placeholder="พิมพ์งานที่ฝึกจริง..." value={main.name || ''} onChange={e => { const n = [...workplaceMainTasks]; n[mIdx].name = e.target.value; setWorkplaceMainTasks(n); }} readOnly={main.isConfirmed} />
                        </div>
                        <button onClick={() => analyzeWorkplaceMainTask(main.id)} disabled={main.isAnalyzing || !main.name || main.isConfirmed} className="w-full py-4 bg-indigo-600 text-white rounded-3xl text-sm font-black hover:bg-indigo-700 shadow-2xl transition flex items-center justify-center gap-3 active:scale-95 font-serif disabled:bg-slate-300 disabled:shadow-none">
                          {main.isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles />} วิเคราะห์งานย่อยและขั้นตอน (ทุกลำดับงาน)
                        </button>
                      </div>
                      {!main.isConfirmed && (
                        <button onClick={() => removeWorkplaceMainTask(main.id)} className="p-3 text-slate-300 hover:text-red-500 transition self-start font-serif"><Trash2 size={24} /></button>
                      )}
                    </div>
                    <div className={`space-y-4 pl-6 md:pl-12 border-l-4 ml-2 font-serif transition-colors ${main.isConfirmed ? 'border-green-300' : 'border-indigo-200'} ${collapsedWorkplaceTasks.has(main.id) ? 'hidden' : ''}`}>
                      {(main.subTasks || []).map((sub, sIdx) => (
                        <div key={sIdx} className={`bg-white p-6 rounded-[30px] border shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 font-serif transition-all duration-300 ${main.isConfirmed ? 'border-green-100 bg-green-50/20' : 'border-slate-100 hover:border-indigo-400'}`}>
                          <div className="flex-1 font-serif w-full">
                            <div className="flex items-center justify-between gap-2 mb-2 font-serif w-full">
                              <div className="flex items-center gap-2 flex-1">
                                <span className={`px-3 py-1 rounded-full font-black text-[10px] shadow-inner font-serif ${main.isConfirmed ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>{sub.id}</span>
                                <input
                                  className={`font-black text-base mt-1 font-serif bg-transparent border-b border-dashed outline-none focus:border-indigo-500 w-full lg:w-2/3 ${main.isConfirmed ? 'border-transparent text-slate-700' : 'border-slate-300 text-slate-800'}`}
                                  value={sub.workplaceName || ''}
                                  onChange={(e) => updateWorkplaceSubtask(mIdx, sIdx, 'workplaceName', e.target.value)}
                                  placeholder="ชื่องานย่อย..."
                                  readOnly={main.isConfirmed}
                                />
                                {!main.isConfirmed && (
                                  <button type="button" onClick={() => analyzeSingleWorkplaceSubtask(mIdx, sIdx)} disabled={sub.isAnalyzing || !sub.workplaceName} className="text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 p-1 transition-colors" title="วิเคราะห์ขั้นตอนของงานย่อยนี้">
                                    {sub.isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {(sub.detailed_steps || []).length > 0 && (
                                  <button
                                    onClick={() => setCollapsedWorkplaceSubTasks(prev => { const s = new Set(prev); s.has(sub.id) ? s.delete(sub.id) : s.add(sub.id); return s; })}
                                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg"
                                  >
                                    {collapsedWorkplaceSubTasks.has(sub.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                    {collapsedWorkplaceSubTasks.has(sub.id) ? 'แสดงขั้นตอน' : 'ซ่อนขั้นตอน'}
                                  </button>
                                )}
                                {!main.isConfirmed && (
                                  <button onClick={() => removeWorkplaceSubtask(mIdx, sIdx)} className="text-red-300 hover:text-red-500 p-2 transition-colors" title="ลบงานย่อย"><Trash2 size={16} /></button>
                                )}
                              </div>
                            </div>
                            
                            <div className={`mt-3 space-y-2 font-serif ${collapsedWorkplaceSubTasks.has(sub.id) ? 'hidden' : 'block'}`}>
                              <p className={`text-[10px] font-black uppercase border-b pb-1 font-serif ${main.isConfirmed ? 'text-green-600 border-green-100' : 'text-indigo-400 border-indigo-50'}`}>ขั้นตอนการปฏิบัติงาน:</p>
                              {sub.detailed_steps?.map((step, si) => (
                                <div key={si} className="flex items-start gap-2 text-[11px] text-slate-600 pl-2 border-l-2 border-slate-100 leading-relaxed font-serif group">
                                  <span className="mt-1.5 font-bold">{si + 1}.</span>
                                  <div className="flex-1 flex flex-col gap-1">
                                    <input
                                      className={`w-full bg-transparent border-b border-dashed outline-none focus:border-indigo-500 py-1 ${main.isConfirmed ? 'border-transparent text-slate-600' : 'border-slate-200'}`}
                                      value={step.step_text || ''}
                                      onChange={(e) => updateWorkplaceStepField(mIdx, sIdx, si, 'step_text', e.target.value)}
                                      placeholder="ระบุขั้นตอนการทำงาน (ขึ้นต้นด้วยคำกริยา)..."
                                      readOnly={main.isConfirmed}
                                    />
                                    <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                      <Briefcase size={10} className="text-slate-400" />
                                      <input
                                        className={`w-full bg-transparent border-b border-dashed outline-none focus:border-indigo-500 py-0.5 text-[10px] text-slate-500 ${main.isConfirmed ? 'border-transparent' : 'border-slate-200'}`}
                                        value={step.equipment || ''}
                                        onChange={(e) => updateWorkplaceStepField(mIdx, sIdx, si, 'equipment', e.target.value)}
                                        placeholder="สื่อ/อุปกรณ์ที่ใช้..."
                                        readOnly={main.isConfirmed}
                                      />
                                    </div>
                                  </div>
                                  {!main.isConfirmed && (
                                    <button type="button" onClick={() => analyzeSingleWorkplaceStep(mIdx, sIdx, si)} disabled={step.isAnalyzing || !step.step_text} className="text-indigo-500 hover:text-indigo-700 disabled:text-slate-300 p-1 mt-0.5 transition-colors" title="วิเคราะห์จุดประสงค์ขั้นตอนนี้">
                                      {step.isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                    </button>
                                  )}
                                  <span className="mt-1.5 text-[9px] font-bold text-slate-400 uppercase font-serif whitespace-nowrap">(K{step.levels?.k} S{step.levels?.s} A{step.levels?.a} Ap{step.levels?.ap})</span>
                                  {!main.isConfirmed && (
                                    <button onClick={() => removeWorkplaceStep(mIdx, sIdx, si)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity mt-1.5" title="ลบขั้นตอนนี้"><X size={14} /></button>
                                  )}
                                </div>
                              ))}
                              {!main.isConfirmed && (
                                <button onClick={() => addWorkplaceStepLocal(mIdx, sIdx)} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1 mt-2 pl-2 py-1"><Plus size={12} /> เพิ่มขั้นตอน</button>
                              )}
                            </div>
                          </div>
                          <div className="bg-slate-100 p-3 rounded-2xl border flex items-center gap-3 font-serif">
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">เวลา (ชม.)</label>
                            <input type="number" className="w-16 text-center bg-white py-1 rounded-lg font-black border text-indigo-600 focus:ring-2 focus:ring-indigo-300 shadow-inner font-serif" value={sub.hours || 0} onChange={e => updateWorkplaceSubtask(mIdx, sIdx, 'hours', Number(e.target.value))} readOnly={main.isConfirmed} />
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                        <div>
                          {!main.isConfirmed && (
                            <button onClick={() => addWorkplaceSubtaskLocal(mIdx)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1"><Plus size={14} /> เพิ่มงานย่อยด้วยตนเอง</button>
                          )}
                        </div>
                        <button onClick={() => toggleConfirmWorkplaceTask(mIdx)} className={`px-6 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 ${main.isConfirmed ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200' : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'}`}>
                          {main.isConfirmed ? <><Settings size={16} /> ปลดล็อกเพื่อแก้ไข</> : <><CheckCircle2 size={16} /> ยืนยันข้อมูลงานนี้</>}
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-12 max-w-7xl mx-auto font-serif text-[11pt] animate-in fade-in duration-700">
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl overflow-x-auto font-serif">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 border-b pb-4 gap-4 font-serif">
                <h3 className="text-xl font-black text-indigo-700 uppercase font-serif tracking-widest flex items-center gap-3"><FileSpreadsheet /> ๓. พิมพ์รายงานแผนการฝึกวิชาชีพ</h3>
                <div className="flex flex-wrap sm:flex-row gap-2 w-full lg:w-auto">
                  <button onClick={() => setActiveReportView('dve0405')} className={`px-4 py-2.5 rounded-2xl text-[11px] font-bold shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap ${activeReportView === 'dve0405' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'}`}>DVE-04-05 (ฝอ.1)</button>
                  <button onClick={() => setActiveReportView('dve0406')} className={`px-4 py-2.5 rounded-2xl text-[11px] font-bold shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap ${activeReportView === 'dve0406' ? 'bg-rose-600 text-white' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'}`}>DVE-04-06 (ฝอ.2)</button>
                  <div className="hidden sm:block border-l border-slate-200 mx-1"></div>
                  <button onClick={() => setShowDownloadConfirm(activeReportView)} className="bg-green-600 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black hover:bg-green-700 shadow-md active:scale-95 flex items-center gap-1.5 transition-all font-serif whitespace-nowrap"><FileDown size={14} /> โหลดหน้านี้</button>
                  <button onClick={() => setShowDownloadConfirm('reports')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black hover:bg-indigo-700 shadow-lg active:scale-95 flex items-center gap-1.5 transition-all font-serif border-2 border-indigo-400 whitespace-nowrap"><FileDown size={14} /> โหลดทั้งหมด</button>
                </div>
              </div>

              <div id="dve-all-area" className="font-serif">
                {/* ฝอ.1 */}
                <div id="dve-0405-area" className={activeReportView !== 'dve0405' ? 'hidden' : ''}>
                  <div className="page-break mb-20 font-serif border-t-2 pt-10 border-dashed border-slate-300">
                    <div className="text-right text-[10pt] mb-2 border p-1 w-fit ml-auto italic font-serif">DVE-04-05 (ฝอ.1)</div>
                    <div className="report-header font-serif text-[11pt] space-y-1.5">
                      <h2 className="text-center font-bold underline uppercase mb-6 font-serif">แผนการฝึกอาชีพตลอดหลักสูตรร่วมกับ {config.companyName || '................'}</h2>
                      <p>ผู้เข้ารับการฝึกระบบทวิภาคี วิทยาลัย {config.collegeName || '................'} ระดับชั้น {config.level || '................'} สาขาวิชา {config.major || '................'}</p>
                      <p>ฝึกงานปีการศึกษา {config.academicYear || '.........'} ระหว่างวันที่ {config.startDate || '.........'} ถึง วันที่ {config.endDate || '.........'} เวลาฝึก {(Number(config.daysPerWeek) || 0) * (Number(config.weeks) || 0)} วัน {totalTrainingHours} ชั่วโมง</p>
                    </div>
                    <div className="font-bold text-[12pt] mb-3 uppercase underline font-serif">๑. รายการงานที่จัดฝึกปฏิบัติจริง</div>
                    <table className="w-full border-collapse border-2 border-black mb-8 text-[10pt] font-serif">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-center font-serif">
                          <th className="border border-black p-2">อาชีพ / ตำแหน่งงานที่ฝึก</th>
                          <th className="border border-black p-2">งานหลักในสถานประกอบการ</th>
                          <th className="border border-black p-2">งานย่อยในสถานประกอบการ</th>
                          <th className="border border-black p-2">ชื่อ-สกุล ครูฝึก</th>
                          <th className="border border-black p-2 w-24">เวลาฝึก (ชม.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workplaceTasksFlat.map((t, i) => (
                          <tr key={i} className="font-serif">
                            <td className="border border-black p-2 text-center">{config.occupation || '-'}</td>
                            <td className="border border-black p-2">{cleanTaskName(t.parentMainTaskName)}</td>
                            <td className="border border-black p-2 font-bold">{cleanTaskName(t.workplaceName)}</td>
                            <td className="border border-black p-2 text-center">{config.trainerName || '-'}</td>
                            <td className="border border-black p-2 text-center font-bold">{t.hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ฝอ.2 */}
                <div id="dve-0406-area" className={activeReportView !== 'dve0406' ? 'hidden' : ''}>
                  <div className="page-break font-serif">
                    {workplaceTasksFlat.map((task, idx) => (
                      <div key={idx} className="mb-20 border-2 border-black p-6 font-serif">
                        <div className="text-right text-[10pt] mb-1 border p-1 w-fit ml-auto italic font-serif">DVE-04-06 (ฝอ.๒)</div>

                        <div className="report-header font-serif text-[11pt] space-y-1.5">
                          <h2 className="text-center font-black text-[14pt] underline mb-6 uppercase font-serif">แผนการฝึกอาชีพรายหน่วยสถานประกอบการ {config.companyName || '................'}</h2>
                          <p>ผู้เข้ารับการฝึกระบบทวิภาคี วิทยาลัย {config.collegeName || '................'} ระดับชั้น {config.level || '................'}</p>
                          <p>อาชีพ / ตำแหน่งงานที่ฝึก {config.occupation || '................'}</p>
                          <p className="mt-2 font-bold font-serif">งานหลัก {task.mainTaskIndex}. {cleanTaskName(task.parentMainTaskName) || '................'}</p>
                          <p className="font-bold text-indigo-700 font-serif">งานย่อย {task.subTaskIndex}. {cleanTaskName(task.workplaceName) || '................'} เวลาฝึก: {task.hours} วัน/ชั่วโมง</p>
                          <p>ชื่อ-สกุล ครูฝึก {config.trainerName || '................'} ตำแหน่ง {config.trainerPosition || '................'}</p>
                        </div>

                        <table className="w-full text-[9pt] border-collapse border-2 border-black font-serif">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-center font-serif">
                              <th className="border border-black p-1 w-8" rowSpan="2">ที่</th>
                              <th className="border border-black p-1 w-1/4" rowSpan="2">ขั้นตอนการปฏิบัติงาน</th>
                              <th className="border border-black p-1 w-1/4" rowSpan="2">จุดประสงค์เชิงพฤติกรรม</th>
                              <th className="border border-black p-1" colSpan="4">ระดับความสามารถที่ต้องการ</th>
                              <th className="border border-black p-1" rowSpan="2">วิธีสอน</th>
                              <th className="border border-black p-1" rowSpan="2">สื่อ / อุปกรณ์</th>
                              <th className="border border-black p-1" rowSpan="2">การประเมิน</th>
                            </tr>
                            <tr className="bg-slate-50 font-bold text-center text-[7pt] font-serif">
                              <th className="border border-black w-7">K</th>
                              <th className="border border-black w-7">S</th>
                              <th className="border border-black w-7">A</th>
                              <th className="border border-black w-8">Ap</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(task.detailed_steps || []).map((step, si) => (
                              <tr key={si} className="align-top leading-tight font-serif">
                                <td className="border border-black p-1 text-center font-bold">{si + 1}</td>
                                <td className="border border-black p-1 font-bold leading-relaxed">{step.step_text}</td>
                                <td className="border border-black p-1 space-y-1 text-[8pt] font-serif">
                                  <p><b>K:</b> {step.objectives?.k || '-'}</p>
                                  <p><b>S:</b> {step.objectives?.s || '-'}</p>
                                  <p><b>A:</b> {step.objectives?.a || '-'}</p>
                                  <p><b>Ap:</b> {step.objectives?.ap || '-'}</p>
                                </td>
                                <td className="border border-black p-1 text-center font-bold text-blue-900">K{step.levels?.k || 1}</td>
                                <td className="border border-black p-1 text-center font-bold text-green-900">S{step.levels?.s || 1}</td>
                                <td className="border border-black p-1 text-center font-bold text-amber-900">A{step.levels?.a || 1}</td>
                                <td className="border border-black p-1 text-center font-bold text-purple-900">Ap{step.levels?.ap || 1}</td>
                                <td className="border border-black p-1 text-[8pt] text-center">สาธิต/ปฏิบัติ</td>
                                <td className="border border-black p-1 text-[8pt] text-left leading-relaxed">{step.equipment || 'ของจริง / คู่มือ'}</td>
                                <td className="border border-black p-1 text-[8pt] text-center">สังเกตพฤติกรรม</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* EVALUATIONS TAB */}
        {activeTab === 'evaluation' && (
          <div className="space-y-12 max-w-7xl mx-auto font-serif text-[11pt] animate-in fade-in duration-700">
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl font-serif">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 border-b pb-4 gap-4 font-serif">
                <h3 className="text-xl font-black text-indigo-700 uppercase font-serif tracking-widest flex items-center gap-3"><ClipboardCheck /> ๔. พิมพ์แบบประเมินและสรุปผล</h3>
                <div className="flex flex-wrap sm:flex-row gap-2 w-full lg:w-auto">
                  <button onClick={() => setActiveEvalView('eval_workplace')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeEvalView === 'eval_workplace' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}><FileText size={16} /> 1. ประเมินปฏิบัติงาน (ย่อย)</button>
                  <button onClick={() => setActiveEvalView('eval_supervision')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeEvalView === 'eval_supervision' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}><FileText size={16} /> 2. นิเทศติดตาม (งานหลัก)</button>
                  <button onClick={() => setActiveEvalView('dve1102')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeEvalView === 'dve1102' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'}`}><FileText size={16} /> 3. สรุปภาพรวม</button>
                  <div className="hidden sm:block border-l border-slate-200 mx-1"></div>
                  <button onClick={() => setShowDownloadConfirm(activeEvalView)} className="bg-green-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-green-700 shadow-md active:scale-95 flex items-center gap-2 transition-all whitespace-nowrap"><FileDown size={18} /> ดาวน์โหลดเอกสารนี้</button>
                </div>
              </div>

              {/* การตั้งค่าแบบประเมิน */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                <h4 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">ตั้งค่ารูปแบบการประเมินติดตาม</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <label className="text-xs font-bold text-slate-500 block mb-2">เลือกรูปแบบมาตราส่วน (Rating Scale)</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="evalType" checked={evalFormType === 'checklist'} onChange={() => setEvalFormType('checklist')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm">แบบเช็คลิสต์ (ทำได้ / ทำไม่ได้)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="evalType" checked={evalFormType === '5'} onChange={() => setEvalFormType('5')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm">แบบประเมิน 5 ระดับ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="evalType" checked={evalFormType === '4'} onChange={() => setEvalFormType('4')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm">แบบประเมิน 4 ระดับ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="evalType" checked={evalFormType === '3'} onChange={() => setEvalFormType('3')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm">แบบประเมิน 3 ระดับ</span>
                      </label>
                    </div>
                  </div>
                  <div className="md:w-2/3">
                    <label className="text-xs font-bold text-slate-500 block mb-2">เลือกรายการประเมิน ด้านกิจนิสัย</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BEHAVIOR_OPTIONS.map(beh => (
                        <label key={beh} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBehaviors.includes(beh)}
                            onChange={() => handleBehaviorToggle(beh)}
                            className="text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <span className="text-[11px] text-slate-700">{beh}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* พื้นที่สำหรับสร้างเอกสาร แบบประเมินปฏิบัติงานเดิม (รายงานย่อย ขั้นตอนการปฏิบัติงาน) */}
              {activeEvalView === 'eval_workplace' && (
                <div id="dve-eval-workplace-area" className="font-serif">
                  {workplaceTasksFlat.map((task, idx) => {
                    let colCount = 4;
                    if (evalFormType === '5') colCount = 7;
                    if (evalFormType === '4') colCount = 6;
                    if (evalFormType === '3') colCount = 5;

                    return (
                      <div key={`eval-wp-${idx}`} className="page-break mb-20 font-serif">
                        <div className="text-right text-[10pt] mb-2 font-bold italic font-serif border-2 border-black p-1 w-fit ml-auto">แบบประเมินปฏิบัติงาน</div>
                        <div className="text-center font-bold mb-6">
                          <h2 className="text-[18pt] uppercase mb-2">แบบประเมินการปฏิบัติงานในสถานประกอบการ</h2>
                        </div>

                        <div className="text-[14pt] mb-6 space-y-1">
                          <p><b>ชื่อนักเรียน:</b> .................................................................... <b>สาขา:</b> {config.major || '....................................................................'}</p>
                          <p><b>สถานประกอบการ:</b> {config.companyName || '....................................................................'} <b>อาชีพที่ฝึก:</b> {config.occupation || '....................................................................'}</p>
                          <p><b>งานหลัก:</b> {task.mainTaskIndex}. {cleanTaskName(task.parentMainTaskName) || '........................................................................................'}</p>
                          <p><b>งานย่อยที่ปฏิบัติ:</b> {task.subTaskIndex}. {cleanTaskName(task.workplaceName) || '........................................................................................'}</p>
                        </div>

                        <p className="mb-2 font-bold text-[14pt]">คำชี้แจง โปรดทำเครื่องหมาย ✓ลงในช่องที่เห็นว่าตรงกับความเป็นจริงมากที่สุด</p>

                        <table className="w-full text-[12pt] border-collapse border-2 border-black font-serif mb-4">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-center">
                              <th className="border border-black p-2 w-[40%] align-middle text-center">หัวข้อประเมิน (งานย่อย)</th>
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
                            <tr className="bg-slate-50 font-bold">
                              <td colSpan={colCount} className="border border-black p-2 pl-4">ส่วนที่ 1 การปฏิบัติงานย่อย</td>
                            </tr>
                            {task.detailed_steps?.length > 0 ? task.detailed_steps.map((step, i) => (
                              <tr key={i} className="align-top">
                                <td className="border border-black p-2 pl-4 text-left">{task.subTaskIndex}.{i + 1} {step.step_text}</td>
                                {Array.from({ length: colCount - 2 }).map((_, j) => <td key={j} className="border border-black p-2"></td>)}
                                <td className="border border-black p-2"></td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={colCount} className="border border-black p-2 text-center text-slate-400">ไม่มีขั้นตอนการปฏิบัติงาน</td>
                              </tr>
                            )}

                            {selectedBehaviors.length > 0 && (
                              <React.Fragment>
                                <tr className="bg-slate-50 font-bold">
                                  <td colSpan={colCount} className="border border-black p-2 pl-4">ส่วนที่ 2 ด้านกิจนิสัย</td>
                                </tr>
                                {selectedBehaviors.map((beh, i) => (
                                  <tr key={`beh-${i}`} className="align-top">
                                    <td className="border border-black p-2 pl-4 text-left">{i + 1}. {beh}</td>
                                    {Array.from({ length: colCount - 2 }).map((_, j) => <td key={j} className="border border-black p-2"></td>)}
                                    <td className="border border-black p-2"></td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            )}
                          </tbody>
                        </table>

                        <div className="mb-8 text-[12pt] leading-relaxed">
                          <b>เกณฑ์การให้คะแนน (Rubric):</b><br />
                          {evalFormType === '5' && "5 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 4 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 3 = ปฏิบัติได้ปานกลาง/ต้องได้รับคำแนะนำบ้าง, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                          {evalFormType === '4' && "4 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 3 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                          {evalFormType === '3' && "3 = ปฏิบัติได้ดี/ถูกต้องสมบูรณ์, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                          {evalFormType === 'checklist' && "ทำได้ = สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน, ทำไม่ได้ = ไม่สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน"}
                        </div>

                        <div className="flex justify-between mt-12 text-[14pt] px-10">
                          <div className="text-center">
                            <p className="mb-6">ลงชื่อ..................................................................</p>
                            <p>(..............................................................)</p>
                            <p>ผู้รับการประเมิน (นักเรียน)</p>
                          </div>
                          <div className="text-center">
                            <p className="mb-6">ลงชื่อ..................................................................</p>
                            <p>({config.trainerName || '..............................................................'})</p>
                            <p>ผู้ประเมิน (ครูฝึก/ผู้ควบคุมงาน)</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* พื้นที่สำหรับสร้างเอกสาร แบบนิเทศติดตามประเมินผล (ตามงานหลักของสถานประกอบการ) */}
              {activeEvalView === 'eval_supervision' && (
                <div id="dve-supervision-area" className="font-serif">
                  {workplaceMainTasks.map((mainTask, mIdx) => {
                    
                    let colCount = 4;
                    if (evalFormType === '5') colCount = 7;
                    if (evalFormType === '4') colCount = 6;
                    if (evalFormType === '3') colCount = 5;

                    return (
                      <div key={`supervision-${mainTask.id}`} className="page-break mb-20 font-serif">
                        <div className="text-center font-bold mb-6">
                          <h2 className="text-[18pt] mb-2">แบบนิเทศติดตามประเมินผลการฝึกอาชีพ</h2>
                          <p className="text-[16pt] font-normal">ระหว่างวิทยาลัย....................................................... กับบริษัท {config.companyName || '.......................................................'}</p>
                          <p className="text-[16pt] font-normal">งานหลักที่รับผิดชอบ: {cleanTaskName(mainTask.name)}</p>
                          <p className="text-[16pt] font-normal">ประจำเดือน.......................................................</p>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '15px', fontSize: '14pt' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '50%', border: '1px solid black', padding: '10px', verticalAlign: 'top', lineHeight: '1.8' }}>
                                ชื่อ....................................................... นามสกุล...................................................<br />
                                แผนกวิชา {config.fieldOfStudy || '.............................................'} ระดับชั้น {config.level || '........................'}<br />
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

                        <p className="mb-2 font-bold text-[14pt]">คำชี้แจง โปรดทำเครื่องหมาย ✓ลงในช่องที่เห็นว่าตรงกับความเป็นจริงมากที่สุด</p>

                        <table className="w-full text-[12pt] border-collapse border-2 border-black font-serif mb-4">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-center">
                              <th className="border border-black p-2 w-[40%] align-middle text-center">หัวข้อประเมิน (งานย่อย)</th>
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
                            <tr className="bg-slate-50 font-bold">
                              <td colSpan={colCount} className="border border-black p-2 pl-4">ส่วนที่ 1 การปฏิบัติงานย่อย</td>
                            </tr>
                            {/* แสดงข้อความรอครูนิเทศ แทน 1.1 1.2 */}
                            {Array.from({ length: 5 }).map((_, i) => (
                              <tr key={`wait-${i}`} className="align-top">
                                <td className="border border-black p-2 pl-4 text-left text-slate-500 italic">รอครูนิเทศวิเคราะห์งานจากรายวิชาต่อไป...</td>
                                {Array.from({ length: colCount - 2 }).map((_, j) => <td key={j} className="border border-black p-2"></td>)}
                                <td className="border border-black p-2"></td>
                              </tr>
                            ))}

                            {selectedBehaviors.length > 0 && (
                              <React.Fragment>
                                <tr className="bg-slate-50 font-bold">
                                  <td colSpan={colCount} className="border border-black p-2 pl-4">ส่วนที่ 2 ด้านกิจนิสัย</td>
                                </tr>
                                {selectedBehaviors.map((beh, i) => (
                                  <tr key={`beh-${i}`} className="align-top">
                                    <td className="border border-black p-2 pl-4 text-left">{i + 1}. {beh}</td>
                                    {Array.from({ length: colCount - 2 }).map((_, j) => <td key={j} className="border border-black p-2"></td>)}
                                    <td className="border border-black p-2"></td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            )}
                          </tbody>
                        </table>

                        <div className="mb-6 text-[12pt] leading-relaxed">
                          <b>เกณฑ์การให้คะแนน (Rubric):</b><br />
                          {evalFormType === '5' && "5 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 4 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 3 = ปฏิบัติได้ปานกลาง/ต้องได้รับคำแนะนำบ้าง, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                          {evalFormType === '4' && "4 = ปฏิบัติได้ดีมาก/ถูกต้องสมบูรณ์, 3 = ปฏิบัติได้ดี/มีข้อผิดพลาดเล็กน้อย, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                          {evalFormType === '3' && "3 = ปฏิบัติได้ดี/ถูกต้องสมบูรณ์, 2 = ปฏิบัติได้พอใช้/ต้องคอยกำกับดูแล, 1 = ต้องปรับปรุง/ไม่สามารถปฏิบัติได้"}
                          {evalFormType === 'checklist' && "ทำได้ = สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน, ทำไม่ได้ = ไม่สามารถปฏิบัติงานได้ตามจุดประสงค์การประเมิน"}
                        </div>

                        <div className="mb-8 text-[14pt]">
                          <p>ความคิดเห็นเพิ่มเติม/ข้อเสนอแนะ..........................................................................................................................................</p>
                          <p>.......................................................................................................................................................................................</p>
                        </div>

                        <div className="flex justify-between mt-12 text-[14pt] px-10">
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

              {/* พื้นที่สำหรับสร้างเอกสาร สรุปภาพรวมการฝึกงาน */}
              {activeEvalView === 'dve1102' && (
                <div id="dve-11-02-area" className="font-serif">
                  <div className="page-break mb-20 font-serif">
                    <div className="text-center font-bold mb-4">
                      <h2 className="text-[18pt] mb-2">แบบสรุปผลการเรียนรู้จากการฝึกงานในสถานประกอบการ</h2>
                    </div>

                    <div className="text-[12pt] mb-4 leading-relaxed">
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

                    <table className="w-full text-[12pt] border-collapse border border-black font-serif">
                      <thead>
                        <tr className="bg-slate-100 text-center font-bold">
                          <th className="border border-black p-2 align-middle text-left" rowSpan="2" style={{ width: '40%' }}>ชื่องานในสถานประกอบการ (งานหลัก)</th>
                          <th className="border border-black p-2 align-middle" colSpan="2" style={{ width: '12%' }}>จำนวน</th>
                          <th className="border border-black p-2" colSpan="4">สถานประกอบการ (70%)</th>
                          <th className="border border-black p-2" colSpan="2">ครูนิเทศก์ (30%)</th>
                          <th className="border border-black p-2 align-middle bg-yellow-100" rowSpan="2" style={{ width: '8%' }}>รวม</th>
                        </tr>
                        <tr className="bg-slate-50 text-center font-bold text-[11pt]">
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
                        <tr className="bg-slate-50">
                          <td colSpan="10" className="border border-black p-2 font-bold">ส่วนที่ 1 การปฏิบัติงาน</td>
                        </tr>
                        {workplaceMainTasks.length > 0 ? workplaceMainTasks.map((t, idx) => (
                          <tr key={idx}>
                            <td className="border border-black p-2 pl-4 text-left">{idx + 1}. {cleanTaskName(t.name)}</td>
                            <td className="border border-black p-1 w-10"></td>
                            <td className="border border-black p-1 text-center text-[10pt] align-middle text-slate-700">คะแนน</td>
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
                            <td className="border border-black p-2 pl-6 text-slate-400 text-center" colSpan="10">ไม่มีข้อมูลงานหลัก</td>
                          </tr>
                        )}
                        <tr className="bg-blue-100/30">
                          <td colSpan="10" className="border border-black p-2 font-bold pl-6">ส่วนที่ 2 ด้านกิจนิสัย</td>
                        </tr>
                        {selectedBehaviors.length > 0 ? selectedBehaviors.map((beh, idx) => (
                          <tr key={`summary-beh-${idx}`}>
                            <td className="border border-black p-2 pl-4 text-left">{idx + 1}. {beh}</td>
                            <td className="border border-black p-1 w-10"></td>
                            <td className="border border-black p-1 text-center text-[10pt] align-middle text-slate-700">คะแนน</td>
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
                            <td className="border border-black p-2 pl-6 text-slate-400 text-center" colSpan="10">ไม่ได้เลือกหัวข้อด้านกิจนิสัย</td>
                          </tr>
                        )}
                        <tr>
                          <td className="border border-black p-2 font-bold text-center">รวมคะแนนฝึกในสถานประกอบการทั้งหมด</td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1 text-center font-bold text-[10pt] align-middle text-slate-700">คะแนน</td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2 bg-gray-200"></td>
                          <td className="border border-black p-2 bg-gray-200"></td>
                          <td className="border border-black p-2 bg-gray-200"></td>
                          <td className="border border-black p-2 bg-yellow-200"></td>
                        </tr>
                        
                        <tr className="font-bold">
                          <td className="border border-black p-2 text-center">รวมคะแนนเต็ม</td>
                          <td colSpan="2" className="border border-black p-2 text-center">100<br /><span className="text-[10pt] font-normal text-slate-400">คะแนน</span></td>
                          <td colSpan="6" className="border border-black p-2 text-center align-middle">สรุปผลการประเมิน</td>
                          <td className="border border-black p-2"></td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="mt-8 text-[14pt]">
                      <p>ความคิดเห็นเพิ่มเติม/ข้อเสนอแนะ..........................................................................................................................................</p>
                      <p>.......................................................................................................................................................................................</p>
                    </div>

                    <div className="flex justify-between mt-12 text-[14pt] px-10">
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
                </div>
              )}

            </div>
          </div>
        )}

        {/* SHARE TAB (แชร์แผนฝึก) */}
        {activeTab === 'share' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500 font-serif">
            {/* โซนอัปโหลดและแชร์ขึ้นคลาวด์ */}
            <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1 space-y-2">
                <h2 className="text-2xl font-black flex items-center gap-2"><UploadCloud /> แชร์แผนฝึกนี้เข้าสู่คลังกลาง</h2>
                <p className="text-indigo-200 text-sm">เมื่อทำแผนฝึกของบริษัทเสร็จแล้ว คุณสามารถแชร์ขึ้นคลังข้อมูล เพื่อให้คุณครูท่านอื่นนำไปใช้ต่อได้</p>
                <div className="bg-indigo-700/50 p-4 rounded-xl mt-4 border border-indigo-500/50">
                  <p className="text-xs font-bold mb-2 flex items-center gap-1"><AlertCircle size={14} /> ข้อมูลที่จะถูกแชร์:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside pl-4 text-indigo-100">
                    <li>ชื่อสถานประกอบการ: {config.companyName || '-'}</li>
                    <li>จังหวัด: {config.province || '-'}</li>
                    <li>ระดับชั้น: {config.level || '-'}</li>
                    <li>ชื่อผู้แชร์ (ครูฝึก): {config.trainerName || '-'}</li>
                    <li>จำนวนงานหลัก: {workplaceMainTasks.length} งาน</li>
                  </ul>
                </div>
              </div>
              <button 
                onClick={shareToCloud} 
                className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-50 shadow-lg active:scale-95 transition-all w-full md:w-auto flex items-center justify-center gap-2"
              >
                <Cloud size={20} /> ยืนยันการแชร์ข้อมูล
              </button>
            </div>
          </div>
        )}

        {/* CLOUD TAB (คลังแผนฝึกอาชีพส่วนกลาง) */}
        {activeTab === 'cloud' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500 font-serif">
            
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm font-serif">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Cloud className="text-indigo-500" /> คลังแผนฝึกอาชีพส่วนกลาง</h2>
                  <p className="text-sm text-slate-500 mt-1">เลือกดาวน์โหลดหรือนำเข้าแผนฝึกของสถานประกอบการต่างๆ ที่เพื่อนครูจัดทำไว้</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                      className="w-full sm:w-48 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                      value={filterProvince}
                      onChange={(e) => setFilterProvince(e.target.value)}
                    >
                      <option value="">ทุกจังหวัด</option>
                      {PROVINCES.map(p => <option key={`filter-${p}`} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="ค้นหาสถานประกอบการ..." 
                      className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cloudData.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    กำลังเชื่อมต่อคลังข้อมูล... หรือยังไม่มีข้อมูลในระบบ
                  </div>
                ) : (
                  cloudData.filter(item => {
                    const matchProv = filterProvince === '' || item.province === filterProvince;
                    const matchQuery = searchQuery === '' || item.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchProv && matchQuery;
                  }).map((item, idx) => (
                    <div key={item.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow group flex flex-col h-full relative">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-black text-indigo-900 text-lg leading-tight line-clamp-2 pr-6" title={item.companyName}>{item.companyName || 'ไม่ระบุชื่อบริษัท'}</h3>
                          <button 
                            onClick={() => setDeleteModalItem(item)} 
                            className="absolute top-5 right-4 text-slate-300 hover:text-red-500 p-1 flex-shrink-0 transition-colors" 
                            title="จัดการ/ลบข้อมูล"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 mb-6">
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-rose-500" /> {item.province || 'ไม่ระบุจังหวัด'}</p>
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2"><User size={14} className="text-indigo-500" /> ระดับ: {item.level || item.config?.level || 'ไม่ระบุ'}</p>
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2"><User size={14} className="text-blue-500" /> จัดทำโดย: {item.creatorName || 'ไม่ระบุ'}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-2"><Clock size={12} /> อัปโหลดเมื่อ: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('th-TH') : 'ไม่ระบุ'}</p>
                          
                          {item.deleteRequest && (
                            <div className="mt-3 bg-orange-100/80 border border-orange-200 text-orange-800 text-[10px] p-2 rounded-xl font-bold flex items-start gap-1.5">
                              <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-orange-600" />
                              <span>มีการแจ้งลบ: {item.deleteRequest}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-auto pt-4 border-t border-slate-200">
                        <button 
                          onClick={() => loadFromCloudItem(item)}
                          className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 rounded-xl text-xs font-black transition-colors flex justify-center items-center gap-1"
                        >
                          <Wand2 size={14} /> นำเข้าแก้ไข
                        </button>
                        <button 
                          onClick={() => downloadCloudItemAsFile(item)}
                          className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-2 rounded-xl text-xs font-black transition-colors flex justify-center items-center gap-1"
                        >
                          <DownloadCloud size={14} /> โหลดไฟล์
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK TAB (ประเมินระบบ) */}
        {activeTab === 'feedback' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500 font-serif">
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 border-b pb-6 gap-6">
                <div>
                  <h2 className="text-2xl font-black text-indigo-900 uppercase flex items-center gap-3"><Star /> ๗. ประเมินการใช้งานระบบ</h2>
                  <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest italic">ความคิดเห็นของคุณช่วยให้เราพัฒนาระบบให้ดียิ่งขึ้น</p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                {[
                  { key: 'ux', label: '1. ความสะดวกและง่ายต่อการใช้งานระบบ (UX/UI)' },
                  { key: 'ai', label: '2. ความแม่นยำและคุณภาพของ AI ในการวิเคราะห์งาน' },
                  { key: 'speed', label: '3. ความรวดเร็วในการทำงานและประมวลผล' },
                  { key: 'reports', label: '4. ความถูกต้องและครบถ้วนของรูปแบบรายงานที่ได้ (ฝอ.1, ฝอ.2, แบบประเมิน)' },
                  { key: 'overall', label: '5. ประโยชน์ภาพรวมที่ได้รับจากการใช้งานระบบนี้' }
                ].map((q, idx) => (
                  <div key={q.key} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="font-bold text-slate-800 mb-4">{q.label}</p>
                    <div className="flex flex-wrap gap-2 md:gap-4">
                      {[5, 4, 3, 2, 1].map(score => (
                        <label key={score} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${systemFeedback[q.key] === score ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                          <input type="radio" name={q.key} value={score} checked={systemFeedback[q.key] === score} onChange={() => setSystemFeedback({ ...systemFeedback, [q.key]: score })} className="hidden" />
                          <span className="text-xl font-black mb-1">{score}</span>
                          <span className="text-[10px] text-center">
                            {score === 5 ? 'ดีมาก' : score === 4 ? 'ดี' : score === 3 ? 'ปานกลาง' : score === 2 ? 'พอใช้' : 'ปรับปรุง'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageSquare size={18} /> ข้อเสนอแนะเพิ่มเติมเพื่อการพัฒนา</p>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
                    rows="4"
                    placeholder="พิมพ์ข้อเสนอแนะ ปัญหาที่พบ หรือฟีเจอร์ที่อยากให้มีเพิ่มเติม..."
                    value={systemFeedback.suggestion}
                    onChange={e => setSystemFeedback({ ...systemFeedback, suggestion: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={submitFeedback} disabled={isSubmittingFeedback} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg active:scale-95 transition-all flex items-center gap-3 disabled:bg-slate-300">
                  {isSubmittingFeedback ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} บันทึกการประเมิน
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={`text-center text-[10px] py-8 border-t mt-8 pb-24 lg:pb-8 font-serif transition-colors duration-500 ${activeTab === 'cloud' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
        <p className="font-bold">© 2026 สุกฤษฏิ์พล โชติอรรฐพล. All Rights Reserved.</p>
        <p className="mt-1">ระบบวิเคราะห์เฉพาะสถานประกอบการ</p>
      </footer>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around z-50 shadow-2xl font-serif px-2 overflow-x-auto overflow-y-hidden whitespace-nowrap hide-scrollbar">
        {[
          { id: 'setup', l: 'ตั้งค่า', i: Settings },
          { id: 'workplace', l: 'วิเคราะห์', i: Building2 },
          { id: 'reports', l: 'รายงาน', i: FileSpreadsheet },
          { id: 'evaluation', l: 'ประเมิน', i: ClipboardCheck },
          { id: 'share', l: 'แชร์', i: UploadCloud },
          { id: 'cloud', l: 'ส่วนกลาง', i: Cloud },
          { id: 'feedback', l: 'ประเมินระบบ', i: Star },
        ].map(nav => (
          <button key={nav.id} onClick={() => setActiveTab(nav.id)} className={`flex flex-col items-center justify-center gap-1 w-16 flex-shrink-0 h-full px-1 ${activeTab === nav.id ? 'text-indigo-600 border-t-2 border-indigo-600 -mt-[1px]' : 'text-slate-400'}`}>
            <nav.i size={18} className={activeTab === nav.id ? 'mt-1' : ''} /><span className="text-[9px] font-bold font-serif">{nav.l}</span>
          </button>
        ))}
      </nav>
      
      {/* ซ่อน scrollbar ใน mobile nav */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default App;
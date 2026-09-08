"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Skill = "communication" | "leadership" | "project";
type View = "home" | "communication" | "leadership" | "project" | "settings";
type Proficiency = "Beginner" | "Intermediate" | "Advanced";
type Role = "student" | "teacher" | "admin";
type Message = { role: "coach" | "student"; text: string };
type Video = { id: string; title: string; meta: string; duration: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const skillMeta: Record<Skill, { label: string; short: string; eyebrow: string; accent: "aqua" | "violet" | "orange"; icon: IconName }> = {
  communication: { label: "Communication", short: "Communication", eyebrow: "Speak with clarity", accent: "aqua", icon: "message" },
  leadership: { label: "Leadership", short: "Leadership", eyebrow: "Lead with intent", accent: "violet", icon: "spark" },
  project: { label: "Project Management", short: "Project", eyebrow: "Make progress visible", accent: "orange", icon: "grid" },
};

const roleCopy: Record<Role, { label: string; tagline: string; preview: string }> = {
  student: {
    label: "Student",
    tagline: "Learn skills that shape your career.",
    preview: "Practice communication, leadership, and project management with an AI coach and real video mentors.",
  },
  teacher: {
    label: "Teacher",
    tagline: "Guide your class with data.",
    preview: "Track student progress, assign skill pathways, and see where your class needs support.",
  },
  admin: {
    label: "Admin",
    tagline: "Run the learning platform.",
    preview: "Manage users, monitor platform health, and control skills, content, and roles.",
  },
};

const prompts: Record<Exclude<Skill, "communication">, { title: string; body: string; options: string[]; insight: string }> = {
  leadership: {
    title: "The silent contributor",
    body: "Your strongest researcher has stopped contributing during team discussions. Two teammates say they are difficult to work with. Your deadline is in five days. What do you do first?",
    options: [
      "Move them to an independent task immediately.",
      "Have a private, curious conversation and listen before deciding.",
      "Tell the team to include them more in every meeting.",
      "Wait until the deadline is over to avoid disruption.",
    ],
    insight: "Strong leadership starts with context, not assumptions. A private conversation protects trust and helps you discover the real constraint before you act.",
  },
  project: {
    title: "The launch-week trade-off",
    body: "Two days before launch, your designer requests a major interface improvement. Engineering estimates it will take three days and could affect a tested integration. What is your best next move?",
    options: [
      "Accept the change because user experience always comes first.",
      "Reject it without discussion because the scope is locked.",
      "Assess user impact and risk with the team, then offer a post-launch option if needed.",
      "Ask engineering to work overnight to fit it in.",
    ],
    insight: "Excellent project managers make trade-offs visible. You balanced user value, delivery risk, and a realistic alternative instead of choosing speed or quality blindly.",
  },
};

const useFlow = [
  { step: "1", title: "Choose your role", body: "Sign up as a Student, Teacher, or Admin. Each view is built for what you actually do." },
  { step: "2", title: "Pick your skills", body: "Select Communication, Leadership, and/or Project Management. Set your starting level." },
  { step: "3", title: "Practice with AI", body: "Talk through scenarios, answer real decisions, and get instant Gemini-powered feedback." },
  { step: "4", title: "Watch & improve", body: "Learn from curated YouTube videos that play directly inside your dashboard." },
];

type IconName = "arrow" | "book" | "chart" | "check" | "chevron" | "close" | "grid" | "home" | "message" | "moon" | "play" | "plus" | "settings" | "spark" | "sun" | "target" | "user" | "wave" | "users" | "shield" | "video";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 4-4 3 2 5-7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>,
    message: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.48 8.8 8.8 0 0 1-3.75-.83L4 19l.93-3.12A7.2 7.2 0 0 1 4 12a7.5 7.5 0 0 1 8-7.48 7.5 7.5 0 0 1 8 6.98Z" />,
    moon: <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />,
    play: <path d="m9 7 8 5-8 5z" fill="currentColor" stroke="none" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.04 2.04-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.02 1.56V20h-2.88v-.09A1.7 1.7 0 0 0 10.9 18.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.04-2.04.06-.06A1.7 1.7 0 0 0 7.32 15a1.7 1.7 0 0 0-1.56-1.02H5.7v-2.88h.06A1.7 1.7 0 0 0 7.32 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06L8.96 6l.06.06A1.7 1.7 0 0 0 10.9 6.4a1.7 1.7 0 0 0 1.02-1.56V4.8h2.88v.04a1.7 1.7 0 0 0 1.02 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.04 2.04-.06.06A1.7 1.7 0 0 0 19.4 15a1.7 1.7 0 0 0 1.56 1.1h.04v2.88h-.04A1.7 1.7 0 0 0 19.4 15Z" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    spark: <path d="m12 3 1.75 5.25L19 10l-5.25 1.75L12 17l-1.75-5.25L5 10l5.25-1.75L12 3Zm6.5 12 .75 2.25L21.5 18l-2.25.75L18.5 21l-.75-2.25L15.5 18l2.25-.75.75-2.25Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    video: <><path d="m22 8-7 4.5L8 17V7l7 4.5L22 8Z" /><rect x="2" y="6" width="15" height="12" rx="2" /></>,
    wave: <path d="M3 12c2.25-5 4.5 5 6.75 0s4.5-5 6.75 0S21 17 21 12" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark"><span /></span>
      <span>ai assist</span>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "aqua" | "violet" | "orange" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export default function Home() {
  const [screen, setScreen] = useState<"login" | "signup" | "dashboard">("login");
  const [view, setView] = useState<View>("home");
  const [light, setLight] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("Ayesha Khan");
  const [signupName, setSignupName] = useState({ first: "", last: "" });
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>(["communication", "leadership", "project"]);
  const [levels, setLevels] = useState<Record<Skill, Proficiency>>({ communication: "Intermediate", leadership: "Beginner", project: "Intermediate" });
  const [taskChoice, setTaskChoice] = useState<number | null>(null);
  const [taskResult, setTaskResult] = useState<null | { score: number; outcome: string; feedback: string }>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "coach", text: "You are leading a five-minute project update. Start by explaining what changed this week and one decision your team needs to make." },
  ]);
  const [messageInput, setMessageInput] = useState("");
  const [conversationDone, setConversationDone] = useState(false);
  const [conversationEvaluation, setConversationEvaluation] = useState<null | { score: number; feedback: string; strengths: string[]; improvement_areas: string[] }>(null);
  const [saved, setSaved] = useState(false);
  const [aiProvider, setAiProvider] = useState("demo");
  const [videos, setVideos] = useState<Record<Skill, Video[]>>({ communication: [], leadership: [], project: [] });
  const [loading, setLoading] = useState(false);

  const currentSkill = view === "communication" || view === "leadership" || view === "project" ? view : null;
  const passwordStrength = 72;
  const greeting = name.split(" ")[0] || "Learner";

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((d) => setAiProvider(d.ai_provider || "demo"))
      .catch(() => setAiProvider("demo"));
  }, []);

  useEffect(() => {
    (Object.keys(skillMeta) as Skill[]).forEach((skill) => {
      fetch(`${API_URL}/api/v1/videos/${skill}`)
        .then((r) => r.json())
        .then((d) => setVideos((prev) => ({ ...prev, [skill]: d.videos || [] })))
        .catch(() => setVideos((prev) => ({ ...prev, [skill]: [] })));
    });
  }, []);

  const homeProgress = useMemo(() => [
    { label: "Communication", value: levels.communication === "Advanced" ? 84 : levels.communication === "Intermediate" ? 68 : 42, color: "aqua" },
    { label: "Leadership", value: levels.leadership === "Advanced" ? 78 : levels.leadership === "Intermediate" ? 61 : 34, color: "violet" },
    { label: "Project Management", value: levels.project === "Advanced" ? 88 : levels.project === "Intermediate" ? 72 : 46, color: "orange" },
  ].filter((item) => selectedSkills.some((skill) => skillMeta[skill].label === item.label || (skill === "project" && item.label === "Project Management"))), [levels, selectedSkills]);

  function toggleSkill(skill: Skill) {
    setSelectedSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  }

  function startDashboard() {
    const fullName = `${signupName.first} ${signupName.last}`.trim();
    if (fullName) setName(fullName);
    if (!selectedSkills.length) setSelectedSkills(["communication"]);
    setScreen("dashboard");
    setView("home");
  }

  async function submitScenario() {
    if (taskChoice === null || !currentSkill || currentSkill === "communication") return;
    setLoading(true);
    const task = prompts[currentSkill];
    try {
      const res = await fetch(`${API_URL}/api/v1/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: currentSkill, level: levels[currentSkill], scenario_title: task.title, scenario_body: task.body, selected_option: taskChoice, options: task.options }),
      });
      const data = await res.json();
      setTaskResult({ score: data.score ?? 88, outcome: data.outcome ?? "improved", feedback: data.feedback ?? task.insight });
    } catch {
      setTaskResult({ score: 88, outcome: "improved", feedback: task.insight });
    }
    setLoading(false);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!messageInput.trim()) return;
    const nextMessages: Message[] = [...messages, { role: "student", text: messageInput.trim() }];
    setMessages(nextMessages);
    setMessageInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, skill: "communication", level: levels.communication }),
      });
      const data = await res.json();
      setMessages((current) => [...current, { role: "coach", text: data.reply || "Keep going — you are making the idea clearer." }]);
    } catch {
      setMessages((current) => [...current, { role: "coach", text: "That is more direct. Name the decision owner and the impact on learners to make it even stronger." }]);
    }
    setLoading(false);
  }

  async function endConversation() {
    setConversationDone(true);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: "communication", level: levels.communication, messages }),
      });
      const data = await res.json();
      setConversationEvaluation({
        score: data.score ?? 76,
        feedback: data.feedback ?? "You gave a specific recommendation and explained the reason. Next, practice naming an owner for the decision.",
        strengths: data.strengths ?? ["Clear recommendation", "Specific reasoning"],
        improvement_areas: data.improvement_areas ?? ["Name the decision owner", "Add impact on learners"],
      });
    } catch {
      setConversationEvaluation({
        score: 76,
        feedback: "You gave a specific recommendation and explained the reason. Next, practice naming an owner for the decision.",
        strengths: ["Clear recommendation", "Specific reasoning"],
        improvement_areas: ["Name the decision owner", "Add impact on learners"],
      });
    }
    setLoading(false);
  }

  function navigate(next: View) {
    setView(next);
    setTaskChoice(null);
    setTaskResult(null);
    setConversationDone(false);
    setConversationEvaluation(null);
    setMobileNav(false);
  }

  if (screen !== "dashboard") {
    const signup = screen === "signup";
    return (
      <main className={`auth-page ${light ? "light" : ""}`}>
        <div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
        <nav className="auth-nav"><Logo /><div className="nav-right"><span className="desktop-copy">{signup ? "Already have an account?" : "New to AI Assist?"}</span><button className="quiet-link" onClick={() => setScreen(signup ? "login" : "signup")}>{signup ? "Sign in" : "Create account"}<Icon name="arrow" size={16} /></button></div></nav>
        <section className="auth-shell">
          <div className="auth-story">
            <Pill tone="aqua">AI-assisted growth</Pill>
            <h1>Learn the skills<br />that move your <em>career.</em></h1>
            <p>AI Assist builds personalized practice paths for communication, leadership, and project management — with real videos and a real AI coach.</p>
            <div className="flow-card">
              <div className="flow-head"><Icon name="spark" size={16} />How AI Assist works</div>
              <div className="flow-list">
                {useFlow.map((item, index) => (
                  <div className="flow-item" key={item.step}>
                    <span className="flow-number">{item.step}</span>
                    {index !== useFlow.length - 1 && <span className="flow-line" />}
                    <div><strong>{item.title}</strong><p>{item.body}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="auth-card">
            <div className="auth-card-heading"><Pill tone="violet">{signup ? "Create your space" : "Welcome back"}</Pill><h2>{signup ? "Make growth personal." : "Pick up where you left off."}</h2><p>{signup ? "Choose your role, pick your skills, and start practicing today." : "Your next meaningful learning moment is ready."}</p></div>
            {signup && (
              <div className="role-select">
                <div className="field-label">I am a</div>
                <div className="role-grid">
                  {(Object.keys(roleCopy) as Role[]).map((r) => (
                    <button type="button" key={r} className={`role-choice ${role === r ? "picked" : ""}`} onClick={() => setRole(r)}>
                      <span className="role-icon"><Icon name={r === "admin" ? "shield" : r === "teacher" ? "users" : "user"} size={18} /></span>
                      <span>{roleCopy[r].label}</span>
                      <b>{role === r ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />}</b>
                    </button>
                  ))}
                </div>
                <p className="role-preview">{roleCopy[role].preview}</p>
              </div>
            )}
            {signup ? (
              <form className="form-grid" onSubmit={(event) => { event.preventDefault(); startDashboard(); }}>
                <div className="split-fields"><label>First name<input required value={signupName.first} onChange={(e) => setSignupName({ ...signupName, first: e.target.value })} placeholder="Ayesha" /></label><label>Last name<input required value={signupName.last} onChange={(e) => setSignupName({ ...signupName, last: e.target.value })} placeholder="Khan" /></label></div>
                <label>Email address<input required type="email" placeholder="you@example.com" /></label>
                <label>Password <span className="field-note">Strong password</span><input required type="password" defaultValue="Assist#learn2026" /><div className="strength"><span><i style={{ width: `${passwordStrength}%` }} /></span><b>Strong</b></div></label>
                <div className="skill-select"><div className="field-label">What do you want to grow?</div><div className="skill-choice-grid">{(Object.keys(skillMeta) as Skill[]).map((skill) => <button type="button" key={skill} className={`skill-choice ${selectedSkills.includes(skill) ? `picked ${skillMeta[skill].accent}` : ""}`} onClick={() => toggleSkill(skill)}><span className="choice-icon"><Icon name={skillMeta[skill].icon} size={18} /></span><span>{skillMeta[skill].short}</span><b><Icon name={selectedSkills.includes(skill) ? "check" : "plus"} size={14} /></b></button>)}</div></div>
                {selectedSkills.length > 0 && <div className="levels-panel"><div className="field-label">Where are you starting?</div>{selectedSkills.map((skill) => <label className="level-field" key={skill}><span><i className={`dot ${skillMeta[skill].accent}`} />{skillMeta[skill].label}</span><select value={levels[skill]} onChange={(e) => setLevels({ ...levels, [skill]: e.target.value as Proficiency })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>)}</div>}
                <label className="check-line"><input type="checkbox" required /><span>I agree to build my learning profile with AI Assist.</span></label>
                <button className="primary-button" type="submit">Create my {role} space <Icon name="arrow" size={18} /></button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={(event) => { event.preventDefault(); setScreen("dashboard"); }}>
                <label>I am signing in as<select value={role} onChange={(e) => setRole(e.target.value as Role)}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></label>
                <label>Email address<input required type="email" defaultValue="ayesha@aiassist.learn" /></label>
                <label>Password <a className="field-note" href="#forgot">Forgot password?</a><input required type="password" defaultValue="Assist#learn2026" /></label>
                <label className="check-line"><input type="checkbox" defaultChecked /><span>Keep me signed in for this demo.</span></label>
                <button className="primary-button" type="submit">Enter my {role} space <Icon name="arrow" size={18} /></button>
                <button className="demo-button" type="button" onClick={() => setScreen("dashboard")}><Icon name="spark" size={17} />Explore the live demo</button>
              </form>
            )}
            <div className="auth-foot">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</div>
          </div>
        </section>
        <button className="auth-theme" aria-label="Toggle color theme" onClick={() => setLight(!light)}><Icon name={light ? "moon" : "sun"} size={18} /></button>
      </main>
    );
  }

  return (
    <main className={`app ${light ? "light" : ""}`}>
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="sidebar-head"><Logo /><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><Icon name="close" /></button></div>
        <div className="learner-card"><div className="avatar">{greeting.slice(0, 1)}</div><div><strong>{name}</strong><span>{role === "student" ? "Level 3 learner" : role === "teacher" ? "Teacher" : "Platform admin"}</span></div><button onClick={() => navigate("settings")}><Icon name="chevron" size={15} /></button></div>
        <nav className="side-nav"><span className="nav-label">YOUR SPACE</span><button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}><Icon name="home" />Home</button>{role === "student" && <><span className="nav-label skills-label">YOUR SKILLS</span>{selectedSkills.map((skill) => <button key={skill} className={`${view === skill ? "active" : ""} ${skillMeta[skill].accent}`} onClick={() => navigate(skill)}><Icon name={skillMeta[skill].icon} />{skillMeta[skill].short}<i className="skill-level">{levels[skill].slice(0, 1)}</i></button>)}</>}<button className={view === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Icon name="settings" />Settings</button></nav>
        <div className="sidebar-bottom"><div className="streak-mini"><span><Icon name="wave" size={18} /></span><div><small>Your streak</small><strong>08 days</strong></div></div><button className="theme-switch" onClick={() => setLight(!light)}><Icon name={light ? "moon" : "sun"} size={17} /><span>{light ? "Dark mode" : "Light mode"}</span><i className={light ? "on" : ""} /></button></div>
      </aside>
      {mobileNav && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <section className="workspace">
        <header className="topbar"><button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><span /><span /><span /></button><div className="crumb"><span>{currentSkill ? skillMeta[currentSkill].label : view === "settings" ? "Settings" : "Your learning space"}</span><strong>{currentSkill ? skillMeta[currentSkill].eyebrow : view === "settings" ? "Shape your learning" : role === "student" ? "Personal practice dashboard" : role === "teacher" ? "Class insights" : "Platform administration"}</strong></div><div className="top-actions"><div className="demo-badge"><span />{aiProvider === "gemini" ? "AI: Gemini" : "Demo mode"}</div><button className="round-button" aria-label="Toggle theme" onClick={() => setLight(!light)}><Icon name={light ? "moon" : "sun"} size={18} /></button><button className="profile-button" onClick={() => navigate("settings")}><span>{greeting.slice(0, 1)}</span><Icon name="chevron" size={15} /></button></div></header>
        <div className="page-content">
          {view === "home" && <HomeView role={role} greeting={greeting} progress={homeProgress} selectedSkills={selectedSkills} levels={levels} onNavigate={navigate} />}
          {currentSkill && <SkillView skill={currentSkill} level={levels[currentSkill]} taskChoice={taskChoice} taskResult={taskResult} setTaskChoice={setTaskChoice} onSubmit={submitScenario} messages={messages} messageInput={messageInput} setMessageInput={setMessageInput} onSend={sendMessage} conversationDone={conversationDone} conversationEvaluation={conversationEvaluation} onEnd={endConversation} videos={videos[currentSkill]} loading={loading} />}
          {view === "settings" && <SettingsView name={name} setName={setName} selectedSkills={selectedSkills} levels={levels} setLevels={setLevels} toggleSkill={toggleSkill} saved={saved} onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }} role={role} setRole={setRole} />}
        </div>
      </section>
    </main>
  );
}

function HomeView({ role, greeting, progress, selectedSkills, levels, onNavigate }: { role: Role; greeting: string; progress: { label: string; value: number; color: string }[]; selectedSkills: Skill[]; levels: Record<Skill, Proficiency>; onNavigate: (view: View) => void }) {
  const primary = selectedSkills[0] || "communication";
  if (role === "teacher") {
    return <TeacherHomeView />;
  }
  if (role === "admin") {
    return <AdminHomeView />;
  }
  return <>
    <section className="hero-panel"><div className="hero-copy"><Pill tone="aqua"><span className="status-dot" />Your next chapter is ready</Pill><h1>Good morning, {greeting}.<br /><span>Make today count.</span></h1><p>Your practice is working. One focused decision today can move your leadership signal forward.</p><button className="primary-button slim" onClick={() => onNavigate(primary)}>Start today&apos;s mission <Icon name="arrow" size={18} /></button></div><div className="hero-visual"><div className="hero-ring ring-one" /><div className="hero-ring ring-two" /><div className="orbit-orb"><Icon name="spark" size={31} /></div><div className="signal-card"><div className="signal-head"><span>Growth signal</span><b>+18%</b></div><div className="signal-wave"><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="signal-foot"><span>Last 30 days</span><strong>On the rise</strong></div></div></div></section>
    <section className="insight-row"><div className="section-heading"><div><Pill>YOUR MOMENTUM</Pill><h2>Progress worth noticing.</h2></div><button className="text-button">View your journey <Icon name="arrow" size={16} /></button></div><div className="metric-grid"><div className="metric-card streak"><div className="metric-icon"><Icon name="wave" /></div><div><span>Current streak</span><strong>08 <em>days</em></strong><small><i className="up" />2 days stronger than last week</small></div><div className="mini-calendar"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b className="today">S</b></div></div><div className="metric-card"><div className="metric-icon violet"><Icon name="target" /></div><div><span>Practice points</span><strong>1,240</strong><small><i className="up" />160 this week</small></div><div className="points-arc"><span>64<small>%</small></span></div></div><div className="metric-card"><div className="metric-icon orange"><Icon name="chart" /></div><div><span>Skill confidence</span><strong>+12%</strong><small>Since your first session</small></div><div className="spark-line"><i /><i /><i /><i /><i /><i /></div></div></div></section>
    <section className="home-grid"><div className="progress-card panel"><div className="card-title"><div><Pill tone="violet">SKILL MAP</Pill><h2>Your learning, in motion.</h2></div><button className="icon-quiet"><Icon name="chart" size={19} /></button></div><div className="progress-list">{progress.map((item) => <div className="progress-row" key={item.label}><div className="progress-name"><span className={`skill-icon ${item.color}`}><Icon name={item.label === "Communication" ? "message" : item.label === "Leadership" ? "spark" : "grid"} size={17} /></span><div><strong>{item.label}</strong><small>{item.value > 70 ? "Steady momentum" : "Building confidence"}</small></div></div><div className="bar-wrap"><span><i className={item.color} style={{ width: `${item.value}%` }} /></span><b>{item.value}%</b></div></div>)}</div><div className="map-foot"><Icon name="spark" size={17} /><p><strong>Pattern spotted:</strong> You make decisions quickly. Stretch your impact by making the <em>why</em> visible to others.</p></div></div>
      <div className="mission-card panel"><div className="mission-top"><Pill tone="orange">TODAY&apos;S MISSION</Pill><span>12 min</span></div><div className="mission-icon"><Icon name={skillMeta[primary].icon} size={24} /></div><h3>{primary === "communication" ? "Lead a decision-making conversation" : primary === "leadership" ? "Navigate a team tension" : "Protect the launch without losing value"}</h3><p>A tailored scenario based on where you are now.</p><button className="dark-button" onClick={() => onNavigate(primary)}>Open mission <Icon name="arrow" size={17} /></button></div></section>
    <section className="continue-section"><div className="section-heading"><div><Pill>KEEP GOING</Pill><h2>Designed for your next move.</h2></div><button className="text-button">See all learning <Icon name="arrow" size={16} /></button></div><div className="continue-grid">{selectedSkills.map((skill, index) => <button className={`continue-card ${skillMeta[skill].accent}`} key={skill} onClick={() => onNavigate(skill)}><span className="number">0{index + 1}</span><span className="continue-icon"><Icon name={skillMeta[skill].icon} size={21} /></span><div><Pill tone={skillMeta[skill].accent}>{levels[skill]}</Pill><h3>{skillMeta[skill].label}</h3><p>{skill === "communication" ? "Practice the moments that make your ideas land." : skill === "leadership" ? "Turn uncertainty into alignment." : "Keep your team moving with calm clarity."}</p></div><span className="continue-arrow"><Icon name="arrow" size={18} /></span></button>)}</div></section>
  </>;
}

function TeacherHomeView() {
  const students = [
    { name: "Ayesha Khan", skill: "Communication", progress: 68, streak: 8 },
    { name: "Bilal Ahmed", skill: "Leadership", progress: 54, streak: 5 },
    { name: "Sara Malik", skill: "Project", progress: 72, streak: 12 },
    { name: "Hassan Raza", skill: "Communication", progress: 41, streak: 3 },
  ];
  return <>
    <section className="hero-panel teacher"><div className="hero-copy"><Pill tone="violet"><span className="status-dot" />Class overview</Pill><h1>Good morning, Teacher.<br /><span>Guide your class forward.</span></h1><p>See where each student stands, identify struggling skills, and send the next practice mission.</p><button className="primary-button slim">Assign new mission <Icon name="arrow" size={18} /></button></div></section>
    <section className="insight-row"><div className="section-heading"><div><Pill>CLASS MOMENTUM</Pill><h2>How your students are doing.</h2></div></div><div className="metric-grid"><div className="metric-card"><div className="metric-icon violet"><Icon name="users" /></div><div><span>Active students</span><strong>24</strong><small><i className="up" />3 joined this week</small></div></div><div className="metric-card"><div className="metric-icon aqua"><Icon name="target" /></div><div><span>Missions completed</span><strong>186</strong><small><i className="up" />28 this week</small></div></div><div className="metric-card"><div className="metric-icon orange"><Icon name="chart" /></div><div><span>Avg. confidence</span><strong>+14%</strong><small>Since last month</small></div></div></div></section>
    <section className="home-grid"><div className="progress-card panel"><div className="card-title"><div><Pill tone="aqua">STUDENT PROGRESS</Pill><h2>Who needs attention this week.</h2></div></div><div className="progress-list">{students.map((s) => <div className="progress-row" key={s.name}><div className="progress-name"><span className="avatar small">{s.name.slice(0, 1)}</span><div><strong>{s.name}</strong><small>{s.skill} · {s.streak} day streak</small></div></div><div className="bar-wrap"><span><i className={s.progress > 65 ? "aqua" : s.progress > 45 ? "violet" : "orange"} style={{ width: `${s.progress}%` }} /></span><b>{s.progress}%</b></div></div>)}</div></div><div className="mission-card panel"><div className="mission-top"><Pill tone="orange">QUICK ACTION</Pill></div><div className="mission-icon"><Icon name="message" size={24} /></div><h3>Send a communication sprint</h3><p>4 students are ready for an advanced conversation scenario.</p><button className="dark-button">Preview sprint <Icon name="arrow" size={17} /></button></div></section>
  </>;
}

function AdminHomeView() {
  return <>
    <section className="hero-panel admin"><div className="hero-copy"><Pill tone="orange"><span className="status-dot" />Platform admin</Pill><h1>Welcome back, Admin.<br /><span>Everything is running.</span></h1><p>Monitor users, manage skills and content, and keep the AI learning experience healthy.</p><button className="primary-button slim">Manage users <Icon name="arrow" size={18} /></button></div></section>
    <section className="insight-row"><div className="section-heading"><div><Pill>PLATFORM HEALTH</Pill><h2>Live system overview.</h2></div></div><div className="metric-grid"><div className="metric-card"><div className="metric-icon aqua"><Icon name="users" /></div><div><span>Total users</span><strong>1,248</strong><small><i className="up" />86 this week</small></div></div><div className="metric-card"><div className="metric-icon violet"><Icon name="video" /></div><div><span>Active videos</span><strong>9</strong><small>YouTube embeds ready</small></div></div><div className="metric-card"><div className="metric-icon orange"><Icon name="shield" /></div><div><span>AI provider</span><strong>Gemini</strong><small>Connected and responding</small></div></div></div></section>
    <section className="home-grid"><div className="progress-card panel"><div className="card-title"><div><Pill tone="violet">USER BREAKDOWN</Pill><h2>Roles across the platform.</h2></div></div><div className="progress-list">
      <div className="progress-row"><div className="progress-name"><span className="skill-icon aqua"><Icon name="user" size={17} /></span><div><strong>Students</strong><small>Active learners</small></div></div><div className="bar-wrap"><span><i className="aqua" style={{ width: "78%" }} /></span><b>78%</b></div></div>
      <div className="progress-row"><div className="progress-name"><span className="skill-icon violet"><Icon name="users" size={17} /></span><div><strong>Teachers</strong><small>Class guides</small></div></div><div className="bar-wrap"><span><i className="violet" style={{ width: "15%" }} /></span><b>15%</b></div></div>
      <div className="progress-row"><div className="progress-name"><span className="skill-icon orange"><Icon name="shield" size={17} /></span><div><strong>Admins</strong><small>Platform managers</small></div></div><div className="bar-wrap"><span><i className="orange" style={{ width: "7%" }} /></span><b>7%</b></div></div>
    </div></div><div className="mission-card panel"><div className="mission-top"><Pill tone="aqua">SYSTEM STATUS</Pill></div><div className="mission-icon"><Icon name="check" size={24} /></div><h3>All services operational</h3><p>FastAPI backend, Gemini AI, and YouTube embeds are responding normally.</p><button className="dark-button">View logs <Icon name="arrow" size={17} /></button></div></section>
  </>;
}

function SkillView({ skill, level, taskChoice, taskResult, setTaskChoice, onSubmit, messages, messageInput, setMessageInput, onSend, conversationDone, conversationEvaluation, onEnd, videos, loading }: { skill: Skill; level: Proficiency; taskChoice: number | null; taskResult: null | { score: number; outcome: string; feedback: string }; setTaskChoice: (value: number) => void; onSubmit: () => void; messages: Message[]; messageInput: string; setMessageInput: (value: string) => void; onSend: (event: FormEvent) => void; conversationDone: boolean; conversationEvaluation: null | { score: number; feedback: string; strengths: string[]; improvement_areas: string[] }; onEnd: () => void; videos: Video[]; loading: boolean }) {
  const meta = skillMeta[skill];
  if (skill === "communication") return <section className="skill-page communication-page"><div className="skill-hero"><div><Pill tone="aqua">{level} pathway</Pill><h1>Say what matters.<br /><span>Make it land.</span></h1><p>Practice clear, confident English in a scenario built around your current edge. Your coach is powered by Gemini.</p></div><div className="skill-score"><span>Communication signal</span><strong>68<small>/100</small></strong><p><i className="up" />6 points this week</p></div></div><section className="skill-video-section"><div className="section-heading"><div><Pill>RECOMMENDED FOR YOU</Pill><h2>Build your voice first.</h2></div></div><VideoRow skill={skill} videos={videos} /></section><div className="conversation-layout"><div className="conversation-card panel"><div className="conversation-head"><div><span className="coach-avatar"><Icon name="spark" size={18} /></span><div><strong>Nia, your AI practice coach</strong><small><i />Listening with you</small></div></div><Pill tone="aqua">{loading ? "Thinking..." : "Live practice"}</Pill></div><div className="scenario-strip"><Icon name="target" size={17} /><span>Scenario: <strong>Guide a project update toward one clear decision.</strong></span></div><div className="message-list">{messages.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "coach" ? "N" : "A"}</span><p>{message.text}</p></div>)}</div>{conversationDone ? <ConversationResult evaluation={conversationEvaluation} /> : <form className="message-form" onSubmit={onSend}><input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Write your response in English..." disabled={loading} /><button type="submit" aria-label="Send message" disabled={loading}><Icon name="arrow" size={18} /></button></form>}<div className="conversation-actions">{!conversationDone && <button className="end-button" onClick={onEnd} disabled={loading}>End conversation <Icon name="check" size={16} /></button>}<span>{conversationDone ? "Session evaluated" : "Your coach will evaluate your complete session."}</span></div></div><aside className="practice-aside"><div className="aside-card"><Pill tone="violet">YOUR FOCUS</Pill><h3>One thing to try</h3><p>Lead with the conclusion, then give your evidence. It makes your point easier to follow.</p><div className="focus-line"><span>Clarity</span><strong>Next up</strong></div></div><div className="aside-card tip"><span className="tip-star"><Icon name="spark" size={19} /></span><h3>Coach&apos;s note</h3><p>Short, specific sentences create more confidence than perfect vocabulary.</p></div></aside></div></section>;
  const task = prompts[skill];
  return <section className="skill-page"><div className="skill-hero"><div><Pill tone={meta.accent}>{level} pathway</Pill><h1>{skill === "leadership" ? <>Turn intention<br />into <span>impact.</span></> : <>Bring calm<br />to <span>complexity.</span></>}</h1><p>{skill === "leadership" ? "Practice decisions that build trust, clarity, and momentum when the answer is not obvious." : "Practice the trade-offs that keep teams aligned, risks visible, and outcomes meaningful."}</p></div><div className={`skill-score ${meta.accent}`}><span>{meta.label} signal</span><strong>{skill === "leadership" ? "61" : "72"}<small>/100</small></strong><p><i className="up" />{skill === "leadership" ? "8" : "12"} points this month</p></div></div><section className="skill-video-section"><div className="section-heading"><div><Pill>CURATED FOR {level.toUpperCase()}</Pill><h2>See how it&apos;s done.</h2></div></div><VideoRow skill={skill} videos={videos} /></section><section className="task-layout"><div className="task-card panel"><div className="task-head"><div><Pill tone={meta.accent}>TODAY&apos;S SCENARIO</Pill><span className="time"><Icon name="target" size={15} />8 min</span></div><div className={`task-mark ${meta.accent}`}><Icon name={meta.icon} size={23} /></div></div><h2>{task.title}</h2><p className="scenario-body">{task.body}</p>{taskResult ? <ScenarioResult result={taskResult} /> : <div className="answer-list">{task.options.map((option, index) => <button key={option} className={taskChoice === index ? `answer selected ${meta.accent}` : "answer"} onClick={() => setTaskChoice(index)}><span>{String.fromCharCode(65 + index)}</span><p>{option}</p><i>{taskChoice === index && <Icon name="check" size={16} />}</i></button>)}</div>}{!taskResult && <button className="primary-button submit" disabled={taskChoice === null || loading} onClick={onSubmit}>{loading ? "Evaluating..." : "Submit your decision"} <Icon name="arrow" size={18} /></button>}</div><aside className="task-aside"><div className="aside-card"><Pill tone="aqua">WHY THIS MATTERS</Pill><h3>Practice the decision before it&apos;s real.</h3><p>Today&apos;s scenario is calibrated to your <strong>{level.toLowerCase()}</strong> level and your recent momentum.</p><div className="skill-meter"><span>Challenge</span><div><i style={{ width: level === "Beginner" ? "42%" : level === "Intermediate" ? "68%" : "88%" }} /></div><b>{level}</b></div></div><div className="aside-card tip"><span className="tip-star"><Icon name="spark" size={19} /></span><h3>Think like a pro</h3><p>Before deciding, name the people affected, the cost of delay, and the smallest safe next step.</p></div></aside></section></section>;
}

function VideoRow({ skill, videos }: { skill: Skill; videos: Video[] }) {
  const [active, setActive] = useState<string | null>(null);
  if (!videos.length) return <div className="video-grid empty">Loading real videos from YouTube...</div>;
  return (
    <div className="video-grid">
      {videos.map((video, index) => (
        <div className={`video-card ${active === video.id ? "playing" : ""}`} key={video.id}>
          {active === video.id ? (
            <div className="video-player">
              <iframe
                src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button className="video-poster" onClick={() => setActive(video.id)}>
              <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} />
              <span className="play-button"><Icon name="play" size={17} /></span>
              <span className="video-duration">{video.duration}</span>
              <span className="poster-number">0{index + 1}</span>
            </button>
          )}
          <div className="video-copy"><h3>{video.title}</h3><p>{video.meta}</p></div>
        </div>
      ))}
    </div>
  );
}

function ScenarioResult({ result }: { result: { score: number; outcome: string; feedback: string } }) {
  const great = result.outcome === "improved" || result.score >= 70;
  return <div className={`result-card ${great ? "success" : "reframe"}`}><div className="result-icon"><Icon name={great ? "check" : "spark"} size={22} /></div><div><Pill tone={great ? "aqua" : "violet"}>{great ? "Strong decision" : "A useful reframe"}</Pill><h3>{great ? `Score: ${result.score}/100` : "Try looking one layer deeper."}</h3><p>{result.feedback}</p><div className="result-footer"><span>{great ? "Your confidence signal moved" : "No change to your level"}</span><strong>{great ? "+8 points" : "Keep practicing"}</strong></div></div></div>;
}

function ConversationResult({ evaluation }: { evaluation: null | { score: number; feedback: string; strengths: string[]; improvement_areas: string[] } }) {
  const score = evaluation?.score ?? 76;
  return <div className="conversation-result"><div className="result-ring"><span>{score}<small>/100</small></span></div><div><Pill tone="aqua">SESSION COMPLETE</Pill><h3>{evaluation?.feedback ?? "Clearer and more decisive."}</h3><div className="score-tags"><span>Strengths {evaluation?.strengths.slice(0, 2).map((s) => <b key={s}>{s}</b>)}</span><span>Next {evaluation?.improvement_areas.slice(0, 2).map((s) => <b key={s}>{s}</b>)}</span></div></div></div>;
}

function SettingsView({ name, setName, selectedSkills, levels, setLevels, toggleSkill, saved, onSave, role, setRole }: { name: string; setName: (value: string) => void; selectedSkills: Skill[]; levels: Record<Skill, Proficiency>; setLevels: (value: Record<Skill, Proficiency>) => void; toggleSkill: (skill: Skill) => void; saved: boolean; onSave: () => void; role: Role; setRole: (role: Role) => void }) {
  return <section className="settings-page"><div className="settings-heading"><Pill tone="violet">YOUR PROFILE</Pill><h1>Shape your learning space.</h1><p>Choose your role, pick your skills, and set your starting level. Your path updates instantly.</p></div><div className="settings-grid"><div className="settings-panel panel"><div className="setting-block"><div className="setting-title"><span className="setting-icon"><Icon name="user" size={19} /></span><div><h2>About you</h2><p>The details that make your practice feel personal.</p></div></div><div className="profile-fields"><label>Display name<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Your role<select value={role} onChange={(e) => setRole(e.target.value as Role)}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></label></div></div><div className="setting-block skill-block"><div className="setting-title"><span className="setting-icon violet"><Icon name="spark" size={19} /></span><div><h2>Your skill pathways</h2><p>Add or remove a pathway whenever your goals evolve.</p></div></div><div className="settings-skill-list">{(Object.keys(skillMeta) as Skill[]).map((skill) => <div className={`settings-skill ${selectedSkills.includes(skill) ? "enabled" : ""}`} key={skill}><button className="skill-toggle" onClick={() => toggleSkill(skill)} aria-label={`Toggle ${skillMeta[skill].label}`}><i /></button><span className={`skill-icon ${skillMeta[skill].accent}`}><Icon name={skillMeta[skill].icon} size={18} /></span><div><strong>{skillMeta[skill].label}</strong><small>{selectedSkills.includes(skill) ? "Included in your learning path" : "Not active yet"}</small></div>{selectedSkills.includes(skill) && <select value={levels[skill]} onChange={(e) => setLevels({ ...levels, [skill]: e.target.value as Proficiency })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>}</div>)}</div></div><div className="save-row"><span>{saved ? "Your learning space is updated." : "Changes update your path immediately."}</span><button className="primary-button slim" onClick={onSave}>{saved ? "Saved" : "Save changes"} <Icon name={saved ? "check" : "arrow"} size={17} /></button></div></div><aside className="settings-aside"><div className="profile-card"><div className="profile-avatar">{name.slice(0, 1) || "A"}</div><h3>{name || "Your name"}</h3><p>Building a focused practice habit.</p><div className="profile-stat"><strong>{selectedSkills.length}</strong><span>active pathways</span></div></div><div className="aside-card tip"><span className="tip-star"><Icon name="spark" size={19} /></span><h3>Your space adapts.</h3><p>New skills instantly appear in your navigation with a proficiency-matched starting point.</p></div></aside></div></section>;
}

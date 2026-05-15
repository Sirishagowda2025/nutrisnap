import { useState, useRef, useCallback } from "react";

const COLORS = {
  bg: "#0A0A0B",
  surface: "#131316",
  card: "#1C1C21",
  border: "#2A2A32",
  accent: "#6EE7B7",
  accentDim: "#1A3D2E",
  text: "#F0EFE9",
  muted: "#888780",
  protein: "#60A5FA",
  carbs: "#FBBF24",
  fat: "#F87171",
  fiber: "#A78BFA",
};

const MacroBar = ({ label, value, max, color }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: COLORS.muted, fontFamily: "monospace", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{value}g</span>
      </div>
      <div style={{ height: 6, background: COLORS.border, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 99, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)"
        }} />
      </div>
    </div>
  );
};

const NutrientChip = ({ label, value }) => (
  <div style={{
    background: COLORS.card, border: `0.5px solid ${COLORS.border}`,
    borderRadius: 10, padding: "8px 14px", textAlign: "center"
  }}>
    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text }}>{value}</div>
  </div>
);

const LoadingDots = () => (
  <span style={{ display: "inline-flex", gap: 4 }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 6, height: 6, background: COLORS.accent, borderRadius: "50%",
        animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
        display: "inline-block"
      }} />
    ))}
  </span>
);

export default function CalorieTracker() {
  const [mode, setMode] = useState("text");
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const fileRef = useRef();
  const dragRef = useRef(false);

  const API_HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  };

  const handleFileChange = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setMode("image");
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragRef.current = false;
    handleFileChange(e.dataTransfer.files[0]);
  }, []);

  const analyzeTextMeal = async (description) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a precise nutrition expert. Given a meal description, return ONLY a valid JSON object with no markdown, no explanation, no extra text. The JSON must have exactly this structure:
{
  "meal_name": "string",
  "total_calories": number,
  "serving_size": "string",
  "macros": {
    "protein": number,
    "carbohydrates": number,
    "fat": number,
    "fiber": number
  },
  "micronutrients": {
    "sodium": "Xmg",
    "calcium": "Xmg",
    "iron": "Xmg",
    "vitamin_c": "Xmg"
  },
  "health_score": number,
  "tags": ["tag1", "tag2"],
  "tip": "one short sentence"
}
Return ONLY the JSON. No markdown. No backticks. No explanation.`,
        messages: [{ role: "user", content: `Analyze this meal: ${description}` }]
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  };

  const analyzeImageMeal = async (base64Data, mimeType) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a precise nutrition expert with vision capabilities. Analyze the food in the image and return ONLY a valid JSON object with no markdown, no explanation, no extra text. The JSON must have exactly this structure:
{
  "meal_name": "string",
  "total_calories": number,
  "serving_size": "string",
  "macros": {
    "protein": number,
    "carbohydrates": number,
    "fat": number,
    "fiber": number
  },
  "micronutrients": {
    "sodium": "Xmg",
    "calcium": "Xmg",
    "iron": "Xmg",
    "vitamin_c": "Xmg"
  },
  "health_score": number,
  "tags": ["tag1", "tag2"],
  "tip": "one short sentence"
}
Return ONLY the JSON. No markdown. No backticks. No explanation.`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64Data } },
            { type: "text", text: "Analyze this food image and provide detailed nutritional information." }
          ]
        }]
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  };

  const handleAnalyze = async () => {
    setError("");
    setResult(null);
    if (mode === "text" && !input.trim()) { setError("Please describe your meal."); return; }
    if (mode === "image" && !imageFile) { setError("Please upload a food image."); return; }
    setLoading(true);
    try {
      let data;
      if (mode === "text") {
        data = await analyzeTextMeal(input.trim());
      } else {
        const base64 = imagePreview.split(",")[1];
        data = await analyzeImageMeal(base64, imageFile.type);
      }
      setResult(data);
      setHistory(prev => [{ ...data, id: Date.now(), source: mode === "image" ? imagePreview : null }, ...prev.slice(0, 4)]);
    } catch (e) {
      setError("Analysis failed: " + (e.message || "Please check your API key and try again."));
    }
    setLoading(false);
  };

  const scoreColor = (s) => s >= 8 ? COLORS.accent : s >= 5 ? COLORS.carbs : COLORS.fat;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: COLORS.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2A32; border-radius: 99px; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `0.5px solid ${COLORS.border}`, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, background: COLORS.accentDim, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
        }}>🥗</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>NutriSnap</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>AI-Powered Calorie Tracker</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: COLORS.muted, background: COLORS.card, padding: "4px 10px", borderRadius: 99, border: `0.5px solid ${COLORS.border}` }}>
          Powered by Claude
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px" }}>

        {/* Mode Toggle */}
        <div style={{ display: "flex", background: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 24, border: `0.5px solid ${COLORS.border}` }}>
          {["text", "image"].map(m => (
            <button key={m} onClick={() => { setMode(m); setResult(null); setError(""); }}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: 9, cursor: "pointer",
                background: mode === m ? COLORS.card : "transparent",
                color: mode === m ? COLORS.text : COLORS.muted,
                fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                transition: "all 0.2s", letterSpacing: "0.01em"
              }}>
              {m === "text" ? "✏️ Describe Meal" : "📷 Photo Scan"}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div style={{ background: COLORS.surface, border: `0.5px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          {mode === "text" ? (
            <>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10, fontFamily: "monospace" }}>// describe your meal</div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="e.g. 2 slices of pepperoni pizza, a can of Coke, and a side salad with ranch"
                rows={3}
                style={{
                  width: "100%", background: "transparent", border: "none", color: COLORS.text,
                  fontSize: 15, fontFamily: "inherit", resize: "none", lineHeight: 1.6
                }}
              />
            </>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); }}
              onDragLeave={() => { }}
              onDrop={handleDrop}
              onClick={() => !imagePreview && fileRef.current.click()}
              style={{
                border: `1.5px dashed ${imagePreview ? COLORS.accent : COLORS.border}`,
                borderRadius: 12, padding: imagePreview ? 0 : 40,
                textAlign: "center", cursor: imagePreview ? "default" : "pointer",
                transition: "border-color 0.2s", overflow: "hidden", position: "relative"
              }}>
              {imagePreview ? (
                <div style={{ position: "relative" }}>
                  <img src={imagePreview} alt="meal" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, display: "block" }} />
                  <button
                    onClick={e => { e.stopPropagation(); setImagePreview(null); setImageFile(null); setResult(null); }}
                    style={{
                      position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)",
                      border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28,
                      cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center"
                    }}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
                  <div style={{ fontSize: 14, color: COLORS.text, marginBottom: 4 }}>Drop a food photo here</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>or click to browse · JPG, PNG, WEBP</div>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFileChange(e.target.files[0])} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: COLORS.fat, fontSize: 13, marginBottom: 12, padding: "10px 14px", background: "#1a0a0a", borderRadius: 8, border: "0.5px solid #3d1515" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", background: loading ? COLORS.accentDim : COLORS.accent,
            color: loading ? COLORS.accent : "#0A1A13", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", letterSpacing: "-0.01em", transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}>
          {loading ? <><LoadingDots /><span>Analyzing...</span></> : "⚡ Analyze Nutrition"}
        </button>

        {/* Result */}
        {result && (
          <div style={{ marginTop: 28, animation: "fadeUp 0.5s ease" }}>

            {/* Calories + meal name */}
            <div style={{ background: COLORS.surface, border: `0.5px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{result.meal_name}</div>
                  <div style={{ fontSize: 13, color: COLORS.muted }}>Serving: {result.serving_size}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 36, fontWeight: 600, color: COLORS.accent, lineHeight: 1, letterSpacing: "-0.03em" }}>{result.total_calories}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>kcal</div>
                </div>
              </div>

              {/* Health score */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "monospace", whiteSpace: "nowrap" }}>health score</div>
                <div style={{ flex: 1, height: 4, background: COLORS.border, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${result.health_score * 10}%`, background: scoreColor(result.health_score), borderRadius: 99, transition: "width 1s ease" }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: scoreColor(result.health_score), whiteSpace: "nowrap" }}>{result.health_score}/10</div>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.tags?.map(tag => (
                  <span key={tag} style={{ fontSize: 12, background: COLORS.accentDim, color: COLORS.accent, borderRadius: 99, padding: "3px 10px", border: `0.5px solid ${COLORS.accent}40` }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Macros */}
            <div style={{ background: COLORS.surface, border: `0.5px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>Macronutrients</div>
              <MacroBar label="PROTEIN" value={result.macros.protein} max={Math.max(result.macros.protein, result.macros.carbohydrates, result.macros.fat) * 1.3} color={COLORS.protein} />
              <MacroBar label="CARBS" value={result.macros.carbohydrates} max={Math.max(result.macros.protein, result.macros.carbohydrates, result.macros.fat) * 1.3} color={COLORS.carbs} />
              <MacroBar label="FAT" value={result.macros.fat} max={Math.max(result.macros.protein, result.macros.carbohydrates, result.macros.fat) * 1.3} color={COLORS.fat} />
              <MacroBar label="FIBER" value={result.macros.fiber} max={Math.max(result.macros.protein, result.macros.carbohydrates, result.macros.fat) * 1.3} color={COLORS.fiber} />

              {/* Macro boxes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
                {[
                  { label: "Protein", value: result.macros.protein, color: COLORS.protein },
                  { label: "Carbs", value: result.macros.carbohydrates, color: COLORS.carbs },
                  { label: "Fat", value: result.macros.fat, color: COLORS.fat },
                  { label: "Fiber", value: result.macros.fiber, color: COLORS.fiber },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: "center", padding: "10px 4px", background: COLORS.card, borderRadius: 10, border: `0.5px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: m.color }}>{m.value}g</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Micronutrients */}
            {result.micronutrients && (
              <div style={{ background: COLORS.surface, border: `0.5px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>Micronutrients</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {Object.entries(result.micronutrients).map(([k, v]) => (
                    <NutrientChip key={k} label={k.replace(/_/g, " ")} value={v} />
                  ))}
                </div>
              </div>
            )}

            {/* Tip */}
            {result.tip && (
              <div style={{ background: COLORS.accentDim, border: `0.5px solid ${COLORS.accent}40`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10 }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.accent, lineHeight: 1.6 }}>{result.tip}</p>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>Recent Meals</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.slice(1).map(h => (
                <div key={h.id} style={{ background: COLORS.surface, border: `0.5px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  {h.source ? (
                    <img src={h.source} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, background: COLORS.card, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽️</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{h.meal_name}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted }}>{h.macros.protein}g P · {h.macros.carbohydrates}g C · {h.macros.fat}g F</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.accent }}>{h.total_calories} <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 400 }}>kcal</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
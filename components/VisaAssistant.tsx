import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import { askVisaCraft, isWebLLMSupported, preloadWebLLM } from "../services/webllmService";

interface Message { role: "user" | "assistant"; content: string }

interface Props {
  context?: { passport?: string; destination?: string; purpose?: string };
}

const VisaAssistant: React.FC<Props> = ({ context }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi. I can help you understand your VisaCraft result. Ask me about documents, conditions, or what you should verify." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const supported = isWebLLMSupported();

  useEffect(() => {
    if (!supported) return;
    setInitializing(true);
    preloadWebLLM().finally(() => setInitializing(false));
  }, [supported]);

  const send = async (text = input) => {
    const value = text.trim();
    if (!value || loading || !supported) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: value }]);
    setLoading(true);
    try {
      const answer = await askVisaCraft(value, context);
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch (error) {
      setMessages((m) => [...m, { role: "assistant", content: "The local AI could not start on this device. You can still use the standard VisaCraft checklist." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography fontWeight={800}>Ask VisaCraft</Typography>
          <Typography variant="caption" color="text.secondary">Private AI · runs in your browser</Typography>
        </Box>
        {!supported && (
          <Typography variant="body2" color="text.secondary">Your browser does not expose WebGPU, so the local AI assistant is unavailable.</Typography>
        )}
        <Box sx={{ maxHeight: 310, overflowY: "auto", pr: 0.5 }}>
          <Stack spacing={1}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ alignSelf: m.role === "user" ? "flex-end" : "stretch", maxWidth: m.role === "user" ? "88%" : "100%", bgcolor: m.role === "user" ? "action.hover" : "background.default", p: 1.3, borderRadius: 2 }}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{m.content}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
        {initializing && <Typography variant="caption" color="text.secondary">Preparing the local AI model… this may take a while the first time.</Typography>}
        <Stack direction="row" spacing={1}>
          <TextField fullWidth size="small" value={input} disabled={!supported || loading} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Ask about your visa…" />
          <Button variant="contained" disabled={!supported || loading || !input.trim()} onClick={() => send()}>{loading ? <CircularProgress size={20} color="inherit" /> : "Ask"}</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          {["What documents do I need?", "What should I verify?", "Does my existing visa help?"] .map((q) => <Button key={q} size="small" variant="text" onClick={() => send(q)} disabled={!supported || loading}>{q}</Button>)}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default VisaAssistant;

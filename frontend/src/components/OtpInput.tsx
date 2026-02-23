"use client";
import { useRef, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
    value: string;
    onChange: (val: string) => void;
    length?: number;
    disabled?: boolean;
}

export default function OtpInput({ value, onChange, length = 6, disabled = false }: OtpInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = value.split("").slice(0, length);
    while (digits.length < length) digits.push("");

    const updateDigit = (index: number, char: string) => {
        const newDigits = [...digits];
        newDigits[index] = char.replace(/\D/g, "").slice(-1);
        onChange(newDigits.join(""));
        if (char && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === "ArrowRight" && index < length - 1) inputRefs.current[index + 1]?.focus();
    };

    const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        onChange(pasted.padEnd(length, "").slice(0, length));
        const focusIdx = Math.min(pasted.length, length - 1);
        inputRefs.current[focusIdx]?.focus();
    };

    return (
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            {digits.map((digit, i) => (
                <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={disabled}
                    onChange={(e) => updateDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKey(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    style={{
                        width: "48px",
                        height: "56px",
                        textAlign: "center",
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        fontFamily: "'Courier New', monospace",
                        borderRadius: "12px",
                        border: digit ? "2px solid var(--brand-600)" : "2px solid var(--border)",
                        background: digit ? "var(--brand-50)" : "var(--bg-card)",
                        color: "var(--text-primary)",
                        outline: "none",
                        transition: "all 0.2s ease",
                        caretColor: "transparent",
                    }}
                />
            ))}
        </div>
    );
}

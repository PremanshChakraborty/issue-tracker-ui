type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: { label: string }[] = [
  { label: "Sign In" },
  { label: "Create Repo" },
  { label: "Install App" },
  { label: "Telegram" },
  { label: "Activate" },
];

export default function StepIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {STEP_LABELS.map((s, i) => {
        const num = (i + 1) as Step;
        const done = currentStep > num;
        const active = currentStep === num;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              flex: i < STEP_LABELS.length - 1 ? 1 : undefined,
            }}
          >
            {/* Step node */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-1)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: `2px solid ${
                    done
                      ? "var(--success)"
                      : active
                      ? "var(--accent)"
                      : "var(--border-default)"
                  }`,
                  background: done
                    ? "var(--success-bg)"
                    : active
                    ? "var(--accent-muted)"
                    : "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all var(--transition-md)",
                  flexShrink: 0,
                }}
              >
                {done ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: active ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {num}
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: "10px",
                  fontWeight: active ? 600 : 400,
                  color: done
                    ? "var(--success)"
                    : active
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.01em",
                }}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background:
                    currentStep > num
                      ? "var(--success)"
                      : "var(--border-muted)",
                  alignSelf: "flex-start",
                  marginTop: 13,
                  transition: "background var(--transition-md)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

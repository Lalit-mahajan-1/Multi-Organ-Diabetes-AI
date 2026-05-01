import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { riskMeta, type OrganResult } from "@/lib/mockData";

export function OrganCard({ organ, onOpen }: { organ: OrganResult; onOpen?: () => void }) {
  const meta = riskMeta[organ.risk];
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[organ.icon] || Icons.Activity;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="clinical-card text-left p-5 w-full hover:shadow-elevated transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${meta.bg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${meta.text}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{organ.name}</h3>
            <p className="text-xs text-muted-foreground">Confidence {organ.confidence}%</p>
          </div>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${meta.bg} ${meta.text}`}
        >
          {meta.label}
        </span>
      </div>

      {organ.hasImage && (
        <div className="mt-4 h-28 rounded-lg overflow-hidden relative bg-gradient-to-br from-primary/80 to-secondary/60 flex items-center justify-center">
          <div className="absolute inset-0 opacity-60 mix-blend-overlay"
            style={{
              background:
                "radial-gradient(circle at 30% 40%, rgba(255,80,80,0.6), transparent 40%), radial-gradient(circle at 65% 55%, rgba(255,200,80,0.5), transparent 45%)",
            }}
          />
          <span className="relative z-10 text-[10px] font-semibold tracking-wider uppercase text-white/90 bg-black/30 px-2 py-1 rounded">
            Grad-CAM Preview
          </span>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Risk score</span>
          <span className={`text-xs font-semibold ${meta.text}`}>{organ.score}/100</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${organ.score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: `var(--${meta.tone})` }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {organ.findings.slice(0, 3).map((f, i) => (
          <li key={i} className="text-xs text-muted-foreground flex gap-2">
            <span className={`mt-1.5 h-1 w-1 rounded-full shrink-0`} style={{ backgroundColor: `var(--${meta.tone})` }} />
            <span className="leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>
    </motion.button>
  );
}

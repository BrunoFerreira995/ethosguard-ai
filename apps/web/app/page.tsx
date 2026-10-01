"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type ScoredLabel = { name: string; confidence: number; evidence?: string[] };
type AnalysisResponse = {
  analysis: {
    moral_classification: string;
    confidence: number;
    virtues: ScoredLabel[];
    principles: ScoredLabel[];
    ethical_issues: ScoredLabel[];
  };
  explanation: { summary: string; reasoning: string[] };
  model: string;
  device: string;
};

const examples = [
  "Encontrei uma carteira e devolvi ao proprietário.",
  "Vou mentir para conseguir dinheiro.",
  "Vou ajudar uma pessoa que está passando fome."
];

function confidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function LabelList({ items, empty }: { items: ScoredLabel[]; empty: string }) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <div className="label-list">
      {items.map((item) => (
        <div className="label-row" key={`${item.name}-${item.confidence}`}>
          <div>
            <strong>{item.name}</strong>
            {item.evidence?.length ? <small>Trechos: {item.evidence.join("; ")}</small> : null}
          </div>
          <span>{confidence(item.confidence)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!text.trim()) {
      setError("Descreva uma situação para iniciar a análise.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3102"}/api/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text })
      });
      const body = await response.json() as AnalysisResponse & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível analisar o texto.");
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível analisar o texto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">ETHOSGUARD · ANÁLISE CONFIGURÁVEL</span>
        <h1>Leia uma situação moral com clareza.</h1>
        <p>
          O sistema identifica virtudes, princípios e possíveis problemas éticos a partir das categorias configuradas.
          O resultado é uma análise de apoio, não uma autoridade religiosa absoluta.
        </p>
      </section>

      <form className="analysis-form" onSubmit={analyze}>
        <label htmlFor="situation">Qual situação você quer analisar?</label>
        <textarea
          id="situation"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ex.: Encontrei uma carteira e devolvi ao proprietário."
          maxLength={5000}
          rows={7}
        />
        <div className="form-footer">
          <span>{text.length}/5000 caracteres</span>
          <button type="submit" disabled={loading}>
            {loading ? "Analisando…" : "Analisar"}
          </button>
        </div>
        <div className="examples" aria-label="Exemplos">
          {examples.map((example) => <button type="button" key={example} onClick={() => setText(example)}>{example}</button>)}
        </div>
      </form>

      {error ? <div className="notice error" role="alert">{error}</div> : null}

      {result ? (
        <section className="results" aria-live="polite">
          <div className="classification-card">
            <div>
              <span className="card-kicker">CLASSIFICAÇÃO MORAL</span>
              <h2>{result.analysis.moral_classification}</h2>
              <p>{result.explanation.summary}</p>
            </div>
            <div className="score">
              <strong>{confidence(result.analysis.confidence)}</strong>
              <span>confiança</span>
            </div>
          </div>

          <div className="card-grid">
            <article className="result-card"><h3>Virtudes identificadas</h3><LabelList items={result.analysis.virtues} empty="Nenhuma virtude acima do limiar foi identificada." /></article>
            <article className="result-card"><h3>Princípios cristãos</h3><LabelList items={result.analysis.principles} empty="Nenhum princípio acima do limiar foi identificado." /></article>
            <article className="result-card issue-card"><h3>Possíveis problemas éticos</h3><LabelList items={result.analysis.ethical_issues} empty="Nenhum problema acima do limiar foi identificado." /></article>
            <article className="result-card"><h3>Justificativa estruturada</h3><ol className="reasoning">{result.explanation.reasoning.map((item) => <li key={item}>{item}</li>)}</ol></article>
          </div>
          <p className="model-note">Modelo: {result.model} · dispositivo: {result.device}</p>
        </section>
      ) : null}
    </main>
  );
}

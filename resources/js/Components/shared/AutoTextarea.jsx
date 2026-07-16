import { useRef, useEffect } from 'react';

/**
 * Textarea que cresce com o conteúdo — sem barra de rolagem interna.
 *
 * Existe por causa da evolução ditada: a transcrição de uma consulta gera MUITO texto, e um
 * textarea de altura fixa vira uma caixinha rolando por dentro, brigando com a rolagem da
 * página. Aqui o campo acompanha o texto e quem rola é a página, como num documento.
 */
export default function AutoTextarea({ value, onChange, minRows = 18, className = '', style, ...props }) {
  const ref = useRef(null);

  const ajustar = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';          // zera antes de medir, senão só cresce e nunca encolhe
    el.style.height = `${el.scrollHeight}px`;
  };

  // reajusta quando o texto muda POR FORA (o ditado do Studio Med cai aqui)
  useEffect(ajustar, [value]);

  /*
   * O piso é `minHeight` em CSS, não o atributo `rows`: com o campo vazio, o scrollHeight
   * colapsa pra uma linha e o `rows` é ignorado — o campo nasceria minúsculo. Com minHeight,
   * o CSS segura o mínimo e o height inline só o ultrapassa quando o texto cresce.
   */
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e); ajustar(); }}
      style={{ minHeight: `${minRows * 1.7}em`, ...style }}
      className={`resize-y overflow-hidden ${className}`}
      {...props}
    />
  );
}

'use client';

export default function PlayersEditor({
  names,
  onChange,
  max = 6,
}: {
  names: string[];
  onChange: (names: string[]) => void;
  max?: number;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        {names.map((n, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input"
              maxLength={18}
              value={n}
              placeholder={`Player ${i + 1}`}
              onChange={(e) => onChange(names.map((v, j) => (j === i ? e.target.value : v)))}
            />
            {names.length > 2 && (
              <button
                type="button"
                className="btn-danger !w-auto px-4"
                onClick={() => onChange(names.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {names.length < max && (
        <button type="button" className="btn-secondary mt-2 !py-3" onClick={() => onChange([...names, ''])}>
          + Add player
        </button>
      )}
    </>
  );
}

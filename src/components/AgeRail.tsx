export function AgeRail({ age, label }: { age: number | string; label: string }) {
  return (
    <aside className="age-rail" aria-label={`${age} 岁，${label}`}>
      <span className="age-rail__number">{age}</span>
      <span className="age-rail__label">岁 / {label}</span>
    </aside>
  );
}

export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-64 animate-pulse rounded-lg bg-neutro-suave" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-neutro-suave" />
      </div>
      <div className="h-80 animate-pulse rounded-[14px] border border-borde bg-white" />
    </div>
  );
}

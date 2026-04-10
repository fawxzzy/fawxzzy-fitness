export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#08131f_0%,#07111b_42%,#050d15_100%)]" />
      <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(rgba(190,214,238,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(190,214,238,0.03)_1px,transparent_1px)] [background-size:100%_24px,24px_100%]" />
      <div className="absolute right-[-12%] top-[-8%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(71,215,196,0.14)_0%,rgba(71,215,196,0.04)_34%,transparent_68%)] blur-3xl" />
      <div className="absolute left-[-8%] top-[28%] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(84,116,150,0.2)_0%,rgba(84,116,150,0.06)_42%,transparent_72%)] blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)] opacity-40" />
    </div>
  );
}

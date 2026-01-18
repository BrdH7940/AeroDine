export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center px-4">
        <img
          src="/unauthorized.jpg"
          alt="Unauthorized Access"
          className="max-w-md w-full mx-auto mb-8 rounded-lg shadow-lg"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          You don't have permission
        </h1>
        <p className="text-lg text-slate-600">
          This page is only accessible to administrators.
        </p>
      </div>
    </div>
  );
}

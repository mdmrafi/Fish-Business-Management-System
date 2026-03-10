const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`animate-spin rounded-full ${sizes[size]} border-ocean-500 border-t-transparent`}></div>
      {text && <p className="text-slate-500 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;

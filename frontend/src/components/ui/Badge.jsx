const Badge = ({ children, variant = 'info', className = '', dot = false }) => {
  const variants = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
    clean: 'badge-clean',
    info: 'badge-info',
  };
  
  const verdictVariants = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
    CLEAN: 'badge-clean',
  };
  
  const badgeClass = verdictVariants[children?.toUpperCase?.()] || variants[variant] || variants.info;
  
  return (
    <span className={`${badgeClass} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />}
      {children}
    </span>
  );
};

export default Badge;
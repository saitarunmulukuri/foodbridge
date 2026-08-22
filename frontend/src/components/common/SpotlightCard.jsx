export const SpotlightCard = ({ children, className = '', spotlightColor, ...props }) => {
  void spotlightColor;
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

export default SpotlightCard;

export const AnimatedList = ({
  items = [],
  renderItem,
  className = '',
  itemClassName = '',
}) => {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, index) => (
        <div
          key={item?.id ?? item?.request_id ?? item?.assignment_id ?? index}
          className={itemClassName}
        >
          {renderItem
            ? renderItem(item, index, false)
            : typeof item === 'string'
              ? <div className="p-4 bg-white border border-slate-200 rounded-lg"><p className="text-sm text-slate-800 m-0">{item}</p></div>
              : item}
        </div>
      ))}
    </div>
  );
};

export default AnimatedList;

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
              ? <div className="p-4 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-xl"><p className="text-sm text-slate-800 dark:text-[#F5F7FA] m-0">{item}</p></div>
              : item}
        </div>
      ))}
    </div>
  );
};

export default AnimatedList;

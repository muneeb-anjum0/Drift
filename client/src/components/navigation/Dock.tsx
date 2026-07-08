import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue, type SpringOptions } from 'motion/react';
import './Dock.css';

type DockChildProps = {
  isHovered?: MotionValue<number>;
};

export type DockItemConfig = {
  label: string;
  description?: string;
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
};

type DockItemProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
  label: string;
  description?: string;
};

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  description,
}: DockItemProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return value - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      aria-label={description ? `${label}: ${description}` : label}
    >
      {Children.map(children, (child) => {
        if (!isValidElement<DockChildProps>(child)) return child;
        return cloneElement(child as ReactElement<DockChildProps>, { isHovered });
      })}
    </motion.button>
  );
}

function DockLabel({
  label,
  description,
  className = '',
  isHovered,
}: {
  label: string;
  description?: string;
  className?: string;
  isHovered?: MotionValue<number>;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return undefined;
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.16 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          <span className="dock-label-title">{label}</span>
          {description ? <span className="dock-label-description">{description}</span> : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`dock-icon ${className}`}>{children}</span>;
}

type DockProps = {
  items: DockItemConfig[];
  className?: string;
  spring?: SpringOptions;
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  dockHeight?: number;
  baseItemSize?: number;
};

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 54,
  distance = 130,
  panelHeight = 58,
  dockHeight = 98,
  baseItemSize = 42,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => Math.max(dockHeight, magnification + 34), [dockHeight, magnification]);
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div style={{ height, scrollbarWidth: 'none' }} className="dock-outer">
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`dock-panel ${className}`}
        style={{ minHeight: panelHeight }}
        role="toolbar"
        aria-label="Application navigation"
      >
        {items.map((item) => (
          <DockItem
            key={item.label}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
            description={item.description}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel label={item.label} description={item.description} />
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}

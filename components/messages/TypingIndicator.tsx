'use client';

interface TypingIndicatorProps {
  userName?: string;
  userColor?: string;
}

/** Renders an animated typing indicator showing who is composing a message. */
export function TypingIndicator({ userName = 'Someone', userColor = '#34D399' }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[70%] items-start flex flex-col">
        {/* Sender Name */}
        <div className="px-4 pb-1">
          <p className="text-xs font-medium" style={{ color: userColor }}>
            {userName}
          </p>
        </div>

        {/* Typing Bubble */}
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 bg-gray-800"
          style={{
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: userColor,
          }}
        >
          <div className="flex items-center gap-1.5">
            {/* Animated Dots */}
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: userColor, animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: userColor, animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: userColor, animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

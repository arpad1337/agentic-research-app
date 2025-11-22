import React from "react";

export function CenteredForm({ children, title }) {
  return (
    <div className="flex items-center justify-center min-h-full p-4 w-full m-auto">
      <div className="w-full max-w-full p-8 bg-card border border-border rounded-lg shadow-2xl transition-all duration-300">
        <h2 className="text-3xl font-bold mb-6 text-center text-primary border-b border-border pb-3">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
import React, { ReactNode } from "react";
import classNames from "classnames";

interface WrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main wrapper component for wizard pages
 */
export const Wrapper: React.FC<WrapperProps> = ({ children, className }) => {
  return (
    <div
      className={classNames(
        "flex w-full grow gap-8 rounded-xl border border-solid border-border bg-base-1 p-4",
        className
      )}
    >
      {children}
    </div>
  );
};

interface SidebarProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

/**
 * Sidebar component for wizard preview/navigation
 */
export const Sidebar: React.FC<SidebarProps> = ({ children, className, label = "" }) => {
  return (
    <div
      className={classNames(
        "preview w-1/3 max-w-[600px] space-y-4 rounded-lg border border-solid border-border bg-base-2 px-8 py-12 pt-5",
        className
      )}
    >
      {label?.length ? (
        <h1 className="text-xl !font-bold !mb-4">{label}</h1>
      ) : null}
      {children}
    </div>
  );
};

interface SidebarSeparatorProps {
  label: string;
}

/**
 * Separator component for sidebar sections
 */
export const SidebarSeparator: React.FC<SidebarSeparatorProps> = ({ label }) => {
  return (
    <div className="flex items-center gap-4 w-full">
      <h3 className="uppercase text-xs font-bold tracking-wider whitespace-nowrap !m-0 !mt-8">
        {label}
      </h3>
      <hr className="border-border w-full opacity-40" />
    </div>
  );
};

interface ContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main content area component for wizard pages
 */
export const Content: React.FC<ContentProps> = ({ children, className }) => {
  return (
    <div
      className={classNames(
        "col-span-2 flex w-full flex-col rounded-lg border border-solid border-border bg-base-1 p-12 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
};

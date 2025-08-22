import { ReactNode } from "react";
type ContainerProps = {
  id?: string
  className?: string
  children: React.ReactNode
}

export default function Container({ id, className, children }: ContainerProps) {
  return (
    <div id={id} className={`max-w-7xl mx-auto ${className || ""}`}>
      {children}
    </div>
  )
}

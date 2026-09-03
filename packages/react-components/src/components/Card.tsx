import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean
}

export function Card({ hover = false, className = '', children, ref, ...props }: CardProps & { ref?: React.Ref<HTMLDivElement> }) {
    const classes = ['card', hover && 'card--hover', className].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
}

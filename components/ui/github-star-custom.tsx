interface GitHubStarCustomProps {
  className?: string
  size?: number
}

export function GitHubStarCustom({ className = "", size = 16 }: GitHubStarCustomProps) {
  return (
    <svg 
      viewBox="0 0 20 20" 
      width={size} 
      height={size}
      className={`text-yellow-500 dark:text-yellow-400 ${className}`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
    </svg>
  )
} 
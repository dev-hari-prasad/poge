import { Star } from "lucide-react"

interface GitHubStarProps {
  className?: string
  size?: number
}

export function GitHubStar({ className = "", size = 16 }: GitHubStarProps) {
  return (
    <Star 
      className={`text-yellow-500 dark:text-yellow-400 ${className}`}
      size={size}
      fill="currentColor"
    />
  )
} 
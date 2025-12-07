import { StarIcon } from "@heroicons/react/24/solid"

interface GitHubStarProps {
  className?: string
  size?: number
}

export function GitHubStar({ className = "", size = 16 }: GitHubStarProps) {
  return (
    <StarIcon 
      className={`text-yellow-500 dark:text-yellow-400 ${className}`}
      style={{ width: size, height: size }}
      fill="currentColor"
    />
  )
} 
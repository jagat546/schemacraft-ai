"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  FolderOpen,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { createProjectAction } from "@/lib/actions/project.actions"
import type { Project } from "@/lib/repositories/project.repository"

export function ProjectsPanel({
  initialProjects,
  loadError,
}: {
  initialProjects: Project[]
  loadError?: string
}) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)

    startTransition(async () => {
      const outcome = await createProjectAction({
        title,
        description: description.trim() ? description : undefined,
      })

      if (!outcome.ok) {
        setError(outcome.error)
        toast.error(outcome.error)
        return
      }

      toast.success("Project created successfully!")

      setTitle("")
      setDescription("")
      setOpen(false)

      router.refresh()
    })
  }

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-6 shadow-sm">

        <div>

          <h2 className="text-2xl font-bold text-violet-900">
            My Projects
          </h2>

          <p className="mt-1 text-sm text-violet-600">
            Organize and manage all your generated database schemas.
          </p>

        </div>

        <Dialog open={open} onOpenChange={setOpen}>

          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </DialogTrigger>

          <DialogContent className="rounded-3xl">

            <DialogHeader>

              <DialogTitle className="text-2xl">
                Create Project
              </DialogTitle>

              <DialogDescription>
                Give your project a memorable name.
              </DialogDescription>

            </DialogHeader>

            <form
              onSubmit={handleCreate}
              className="space-y-5"
            >

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Project Name
                </label>

                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Employee Management System"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Short description..."
                />

              </div>

              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <DialogFooter>

                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  Cancel
                </DialogClose>

                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    title.trim().length === 0
                  }
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {isPending
                    ? "Creating..."
                    : "Create Project"}

                </Button>

              </DialogFooter>

            </form>

          </DialogContent>

        </Dialog>

      </div>

      {/* Error */}

      {loadError && (
        <p className="text-red-600">{loadError}</p>
      )}

      {/* Empty State */}

      {initialProjects.length === 0 ? (
        <Card className="border-violet-200 bg-white shadow-lg">

          <CardContent className="flex flex-col items-center py-16">

            <div className="rounded-full bg-violet-100 p-5">

              <FolderOpen className="h-10 w-10 text-violet-600" />

            </div>

            <h3 className="mt-6 text-xl font-semibold text-violet-900">
              No Projects Yet
            </h3>

            <p className="mt-2 max-w-md text-center text-violet-500">
              Create your first project and start generating
              beautiful SQL schemas using AI.
            </p>

          </CardContent>

        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

          {initialProjects.map((project) => (
            <Card
              key={project.id}
              className="transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl"
            >

              <CardHeader>

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">

                  <Sparkles className="h-6 w-6 text-violet-600" />

                </div>

                <CardTitle className="text-lg">
                  {project.title}
                </CardTitle>

                {project.description && (
                  <CardDescription>
                    {project.description}
                  </CardDescription>
                )}

              </CardHeader>

              <CardContent>

                <div className="flex items-center gap-2 text-sm text-violet-500">

                  <Calendar className="h-4 w-4" />

                  Ready for schema generation

                </div>

              </CardContent>

            </Card>
          ))}

        </div>
      )}

    </div>
  )
}
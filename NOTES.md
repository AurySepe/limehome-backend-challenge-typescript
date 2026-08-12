# AI Project Setup

In every project of mine, I add two core skills to manage the AI. Probably, for this specific version, an extensive and organized use of AI was not essential because it is a relatively small and simple project. However, I added the setup anyway because I think it is interesting for you to evaluate how I usually integrate this technology into my work.

I added 2 skills that guide the way I work with AI:

* **`codebase-explorer`**  
  Helps me during brainstorming and reasoning phases, where I formulate an idea or a plan on how to work. It sets the agent to respond by giving only information, without suggesting modifications or implementing anything, so that we can effectively reason about the problem or future choices without immediately modifying things uselessly.

* **`implementation-planner`**  
  Sets the agent into an action phase. In this mode, it reads the guidelines I create for each project ([development-guidelines.md](guidelines/development-guidelines.md)). In this case, I didn't want to needlessly complicate the project architecture, so I wrote relatively simple and concise guidelines to follow. After reading them, it gathers context for that task and formulates a plan that I must review and correct before proceeding with the implementation.

---

### Docker Fix

When starting the project with Docker, an error occurred because the `prisma.config.ts` file was not being copied into the container image. As a result, the Prisma schema could not be found at startup. It seemed strange to me, as I expected the project to be ready to run out of the box since it was set up this way, not sure if my local docker setup was the issue, but I don't think it was.
I solved the problem by adding a copy command for the `prisma.config.ts` file to the Dockerfile.
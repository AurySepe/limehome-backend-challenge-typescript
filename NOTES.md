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


### Overlapping Bookings Bug Fix

Reading the `bookings.ts` file, it was clear that the way date compatibility was checked was wrong, as it did not check whether booking time intervals overlapped, but simply checked if the check-in date was equal. Furthermore, in checks involving the same user, it did not check dates at all, preventing the user from booking the same room or any other room in general, whereas it should only do so if there are overlapping dates.

Additionally, it is important to note that a user can check in on the same day another user checks out, since rooms are usually cleaned during that window; consequently, booking date intervals can overlap at the boundary (start and end dates). At this point, I had to decide how to calculate and compare these intervals. Initially, I did not want to modify the data schema, but keeping only the check-in date and number of nights made it impossible to write a Prisma query calculating the check-out date directly. The only alternative was using raw SQL, which I strongly advise against because it is not type-safe and makes it very easy to introduce errors. Therefore, I decided the best approach was to add a derived `checkOutDate` field. I could potentially have removed `numberOfNights`, but usually it is better to avoid deleting pre-existing data. Consequently, I planned a Prisma migration, which I also had to handle manually: first, I added the column as optional to prevent errors if data already existed in the DB, then calculated and populated the value for existing records via query, and finally removed the column's optionality.

After making this change, I implemented a utility to calculate the check-out date and another to generate the correct Prisma `where` clause, which was reused across the various checks.

I also added a test to verify that a user could re-book the same room for a new date range that does not conflict with the previous one.

Initially, I wanted to remove the first check (the one verifying if the user has already booked that specific room for those exact dates), which is technically already covered by the subsequent two checks. However, removing it would have caused existing tests to fail due to a different error message, so I kept it. Is the purpose of this extra check solely to provide a clearer error message? If so, I would consider removing it.
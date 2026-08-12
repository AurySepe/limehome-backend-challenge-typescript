### Multiple Branches by Complexity

This project features a simplified architecture, which I assume was designed by choice to enable a quick review process and evaluate problem-solving at this level of complexity. However, I decided to provide two versions of the challenge:

- **Main Branch**: Respects the initial project setup and its simplified structure without over-engineering it.
- **Advanced Branch (`refactoring-typescript-challenge`)**: Reflects how I would structure a real-world production project. It includes a more organized, modular architecture with better file separation, strong input and output data validation with automatic OpenAPI/Swagger integration, and transaction management to prevent concurrent request issues.


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
I also updated the compose setup to run `prisma migrate deploy` at startup in order to ensure that the schema is always up to date with the code insted of `db push` because it is more consistent.


### Overlapping Bookings Bug Fix

Reading the `bookings.ts` file, it was clear that the way date compatibility was checked was wrong, as it did not check whether booking time intervals overlapped, but simply checked if the check-in date was equal. Furthermore, in checks involving the same user, it did not check dates at all, preventing the user from booking the same room or any other room in general, whereas it should only do so if there are overlapping dates.

Additionally, it is important to note that a user can check in on the same day another user checks out, since rooms are usually cleaned during that window; consequently, booking date intervals can overlap at the boundary (start and end dates). At this point, I had to decide how to calculate and compare these intervals. Initially, I did not want to modify the data schema, but keeping only the check-in date and number of nights made it impossible to write a Prisma query calculating the check-out date directly. The only alternative was using raw SQL, which I strongly advise against because it is not type-safe and makes it very easy to introduce errors. Therefore, I decided the best approach was to add a derived `checkOutDate` field. I could potentially have removed `numberOfNights`, but usually it is better to avoid deleting pre-existing data. Consequently, I planned a Prisma migration, which I also had to handle manually: first, I added the column as optional to prevent errors if data already existed in the DB, then calculated and populated the value for existing records via query, and finally removed the column's optionality.

After making this change, I implemented a utility to calculate the check-out date and another to generate the correct Prisma `where` clause, which was reused across the various checks.

I also added a test to verify that a user could re-book the same room for a new date range that does not conflict with the previous one.

Initially, I wanted to remove the first check (the one verifying if the user has already booked that specific room for those exact dates), which is technically already covered by the subsequent two checks. However, removing it would have caused existing tests to fail due to a different error message, so I kept it. Is the purpose of this extra check solely to provide a clearer error message? If so, I would consider removing it.

### Booking Extension Feature & Architecture Refactoring

I implemented the new API endpoint `POST /api/v1/booking/:id/extend` to allow guests to extend an active booking by a specified number of extra nights (`extraNights`).

I decided that the extension should be possible until the end of the check-out day, provided that the unit is available and not occupied by other guests, and that the user does not have another booking at the same time as the extension.

I could have simply updated the `Booking` table and extended the number of nights directly in the database. However, in that way, it would not be possible to know that an extension had taken place in the past. Having that information can be useful for audit reasons or to create a better user experience (for example, the frontend could show that you extended your stay and present a dedicated screen). For this reason, I added a new table that saves the history of extensions made for a reservation, while also updating the original booking.

Since the controller file was getting bloated, I decided to move the validation logic for both routes into a service file to make it more readable.

The check verifies that the booking is active and that the extended dates do not conflict with other bookings. If the extension is possible, I return a success response with the new check-out date and the updated number of nights; otherwise, I return the reason why the extension is not possible.

I then use a transaction to create the extension record and update the booking table. This ensures that if something goes wrong in one of the operations, the other is rolled back, keeping the database in a consistent state. (Transactions should also be used to handle concurrent requests, but I kept the implementation simpler for this version).

I added new tests and divided them into separate files for each feature to improve readability.

To ensure that dates are checked only by day rather than hours and milliseconds (which are irrelevant for these checks), I added the `date-fns` library. It provides reliable helpers to normalize JavaScript dates to full days, making date comparisons much more reliable.
day 14
Hands-on Engineering: Claude SDK + Inngest

git pr Rivew BOT

used
LLM model = OpenAI
Inngest workflow Engine
Ocktokit (official Github SDK)
Manually Tigger



CLI MVP
workflow = sequence of steps
unit of work

input repo url, pr number
fetch PR info  (titel, user,commits, draft,state)
if PR 404 ----------------> return {not found}
if PR found -- check is open -->if not  retrun {pr not open}
 fetch chages ---> all chages
 no chage <=0 ------>
 if found chages ---> AI revew
                 ai give comment
                 add comment on github
                 



inngest Blueprint
webHook/event  ----> Function
1.check is pr is valid or not
2. query the db and vectore store if repo is index or not
3. if not indexed
4. index the repo
5. fetch the chages in paginated mode
6. call llm with changes and get review
7. post review comment
8. if more file are there (from step 5)
9. repeat step 5 -8 with next set of file

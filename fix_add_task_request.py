import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure useAddRequestTask is imported
if "useAddRequestTask" not in content:
    content = content.replace("useAddRequestNote,", "useAddRequestNote, useAddRequestTask,")

# Add the addTaskMutation and state
if "addTaskMutation =" not in content:
    content = content.replace("const addNoteMutation = useAddRequestNote();", "const addNoteMutation = useAddRequestNote();\n  const addTaskMutation = useAddRequestTask();\n  const [newTask, setNewTask] = useState('');\n  const [showTaskInput, setShowTaskInput] = useState(false);")

# Replace handleAddNote with handleAddTask as well
if "handleAddTask" not in content:
    add_task_func = """
  const handleAddTask = async () => {
    if (!newTask.trim() || !reqId) return;
    try {
      await addTaskMutation.mutateAsync({
        requestId: reqId,
        title: newTask,
        businessId: businessId
      });
      setNewTask('');
      setShowTaskInput(false);
      toast.success('Task added successfully');
    } catch (err: any) {
      toast.error('Failed to add task: ' + err.message);
    }
  };
"""
    content = content.replace("const handleAddNote = async () => {", add_task_func + "\n  const handleAddNote = async () => {")

# Find the Task button and wire it up
old_task_btn = '<Button size="sm" variant="outline" className="h-8"><CheckCircle className="h-4 w-4 mr-1" /> Add Task</Button>'
new_task_btn = '<Button size="sm" variant="outline" className="h-8" onClick={() => setShowTaskInput(true)}><CheckCircle className="h-4 w-4 mr-1" /> Add Task</Button>'

content = content.replace(old_task_btn, new_task_btn)

# Insert the task input UI
if "showTaskInput && (" not in content:
    task_ui = """
                {showTaskInput && (
                  <div className="space-y-2 mt-4 bg-stone-50 p-3 rounded border">
                    <p className="text-xs font-semibold">New Task</p>
                    <textarea 
                      placeholder="What needs to be done?"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      className="w-full text-sm min-h-[60px] p-2 border rounded"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setShowTaskInput(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleAddTask} disabled={addTaskMutation.isPending || !newTask.trim()}>Save Task</Button>
                    </div>
                  </div>
                )}
"""
    # Insert right after the Notes input area
    content = content.replace('<Button size="sm" className="h-8 bg-brand-primary" onClick={handleAddNote}>Post Note</Button>\n                  </div>\n                </div>', '<Button size="sm" className="h-8 bg-brand-primary" onClick={handleAddNote}>Post Note</Button>\n                  </div>\n                </div>\n' + task_ui)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Wired up Add Task in Request360Panel")

// Fixed Message Instructor Function for course-details-enrolled.html
// Replace the existing message instructor functionality with this clean version

document.getElementById("start-chat-btn").addEventListener("click", async () => {
    const instructorName = document.getElementById("course-instructor").textContent.trim();

    if (!instructorName || !courseData) {
        Swal.fire({
            icon: "warning",
            title: "Course data incomplete",
            text: `Missing data: ${!instructorName ? 'instructor name' : ''} ${!courseData ? 'course data' : ''}`,
        });
        console.error('Course data:', courseData);
        return;
    }

    try {
        // Validate authentication
        validateAuth();

        // Check for existing conversations first
        const res = await fetch(`https://mazengad6-001-site1.rtempurl.com/api/Chat/conversations`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            const conversations = await res.json();
            const existingChat = conversations.find(c =>
                (c.otherUserName === instructorName || c.otherUserName === courseData.instructorName) &&
                c.courseId == courseId
            );

            if (existingChat) {
                // Existing conversation found - go to chat
                localStorage.setItem("chat_target", JSON.stringify({
                    otherUserId: existingChat.otherUserId,
                    courseId: existingChat.courseId,
                    userName: existingChat.otherUserName
                }));
                window.location.href = "chat.html";
                return;
            }
        }

        // No existing conversation - create new one
        // Try to get instructor ID from course data
        let receiverId = null;

        // Method 1: Check if course data has instructor ID
        if (courseData.instructorId && String(courseData.instructorId).match(/^\d+$/)) {
            receiverId = String(courseData.instructorId);
            console.log(`✅ Using instructor ID from course data: ${receiverId}`);
        }
        // Method 2: Try to get course details to find instructor ID
        else {
            try {
                console.log(`🔍 Fetching course details for instructor ID...`);
                const courseRes = await fetch(`https://mazengad6-001-site1.rtempurl.com/api/Course/${courseId}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (courseRes.ok) {
                    const courseDetails = await courseRes.json();
                    console.log('Course details:', courseDetails);

                    if (courseDetails.instructorId) {
                        receiverId = String(courseDetails.instructorId);
                        console.log(`✅ Found instructor ID from course details: ${receiverId}`);
                    } else if (courseDetails.instructor && courseDetails.instructor.id) {
                        receiverId = String(courseDetails.instructor.id);
                        console.log(`✅ Found instructor ID from instructor object: ${receiverId}`);
                    }
                } else {
                    console.log(`❌ Could not fetch course details: ${courseRes.status}`);
                }
            } catch (error) {
                console.log('❌ Error fetching course details:', error.message);
            }
        }

        // If we still don't have receiverId, show error
        if (!receiverId) {
            throw new Error(`Cannot find instructor ID for this course. The course may not have an assigned instructor or the instructor data is not available.`);
        }

        // Create payload in exact format expected by backend (SendMessageDto)
        const payload = {
            "receiverId": receiverId,
            "courseId": Number(courseId),
            "content": `Hello! I have a question about the course: ${courseData.title}`
        };

        // Validate required fields
        if (!payload.receiverId || isNaN(payload.courseId) || !payload.content) {
            throw new Error('Invalid payload: receiverId, courseId, and content are required');
        }

        console.log('Starting conversation with validated payload:', JSON.stringify(payload, null, 2));

        const sendRes = await fetch(`https://mazengad6-001-site1.rtempurl.com/api/Chat/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!sendRes.ok) {
            const errorText = await sendRes.text();
            throw new Error(`Failed to start conversation: ${sendRes.status} ${errorText}`);
        }

        // Success - set target and go to chat
        localStorage.setItem("chat_target", JSON.stringify({
            otherUserId: receiverId,
            courseId: courseId,
            userName: instructorName
        }));

        Swal.fire({
            icon: "success",
            title: "Conversation started!",
            text: "Redirecting to chat...",
            timer: 1500,
            showConfirmButton: false
        });

        setTimeout(() => {
            window.location.href = "chat.html";
        }, 1500);

    } catch (err) {
        console.error("❌ Unable to start chat:", err);
        Swal.fire({
            icon: "error",
            title: "Unable to start chat",
            text: err.message || "Please try again later or contact support.",
        });
    }
});
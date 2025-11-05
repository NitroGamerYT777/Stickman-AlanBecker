import pymunk
from windows_manager import get_visible_windows

class PhysicsWorld:
    def __init__(self):
        self.space = pymunk.Space()
        self.space.gravity = (0, 900)  # Standard gravity

        # Create static bodies for the desktop windows
        self._create_window_obstacles()

    def _create_window_obstacles(self):
        windows = get_visible_windows()
        for window in windows:
            x1, y1, x2, y2 = window['rect']
            width = x2 - x1
            height = y2 - y1

            # Pymunk's coordinate system starts from bottom-left,
            # but window coordinates start from top-left. We'll need to adjust later.
            # For now, let's just create the shapes.
            center_x = x1 + width / 2
            center_y = y1 + height / 2

            body = pymunk.Body(body_type=pymunk.Body.STATIC)
            body.position = (center_x, center_y)
            shape = pymunk.Poly.create_box(body, (width, height))
            shape.friction = 0.8
            self.space.add(body, shape)
            print(f"Created obstacle for: {window['title']}")

    def update(self, dt):
        """Advances the physics simulation by a time step."""
        self.space.step(dt)

if __name__ == '__main__':
    # For testing, create a world and run the simulation for a few steps
    world = PhysicsWorld()
    for i in range(10):
        world.update(1/60.0)
    print("Physics world created and updated successfully.")
